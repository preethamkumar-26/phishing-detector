'use client';

import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import './RubberSegment.css';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const SPRING_UI = { type: 'spring' as const, duration: 0.3, bounce: 0 };
const SPRING_MOMENTUM = { type: 'spring' as const, duration: 0.4, bounce: 0.2 };
const SPRING_RELAX = { type: 'spring' as const, duration: 0.16, bounce: 0 };
const DILATE = 0.19;
const HANDOFF = 0.15;
const FLICK = 110;
const MAX_VELOCITY = 2000;
const DEADZONE = 4;
const SLOP = 10;
const RUBBER = 0.55;

const SIZES = {
  sm: { height: 28, font: 12, pad: 10, min: 36 },
  md: { height: 34, font: 12.5, pad: 12, min: 40 },
  lg: { height: 42, font: 14, pad: 16, min: 48 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rubber = (over: number, dim: number) => (over * dim * RUBBER) / (dim + RUBBER * Math.abs(over));
const project = (v: number, glide: number) => {
  const d = 1 - 0.1 * Math.pow(0.05, glide / 100);
  return ((v / 1000) * d) / (1 - d);
};

const velocityOf = (hist: [number, number][], now: number) => {
  const recent = hist.filter(([t]) => now - t <= 100);
  if (recent.length < 2) return 0;
  const [t0, x0] = recent[0];
  const [t1, x1] = recent[recent.length - 1];
  return t1 - t0 >= 8 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
};

const nearestSlot = (slots: { l: number; r: number }[], x: number) => {
  let best = 0;
  for (let i = 1; i < slots.length; i++) {
    if (Math.abs((slots[i].l + slots[i].r) / 2 - x) < Math.abs((slots[best].l + slots[best].r) / 2 - x)) {
      best = i;
    }
  }
  return best;
};

export interface RubberSegmentItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export interface RubberSegmentProps {
  items: (string | RubberSegmentItem)[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string, index: number) => void;
  trackColor?: string;
  thumbColor?: string;
  textColor?: string;
  activeTextColor?: string;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  inset?: number;
  equalSlots?: boolean;
  stretch?: number;
  squash?: number;
  speed?: number;
  glide?: number;
  draggable?: boolean;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
  ariaLabel?: string;
}

export default function RubberSegment({
  items,
  value,
  defaultValue,
  onChange,
  trackColor = 'var(--bg-elevated, #1a263c)',
  thumbColor = 'var(--primary-accent, #2563eb)',
  textColor = 'var(--text-muted, #94a3b8)',
  activeTextColor = '#ffffff',
  size = 'md',
  radius = 10,
  inset = 3,
  equalSlots = false,
  stretch = 80,
  squash = 3,
  speed = 1.1,
  glide = 75,
  draggable = true,
  disabled = false,
  className = '',
  'aria-label': ariaLabelProp,
  ariaLabel = 'Segmented control',
}: RubberSegmentProps) {
  const effectiveAriaLabel = ariaLabelProp || ariaLabel;
  const list: RubberSegmentItem[] = items.map((item) =>
    typeof item === 'string' ? { value: item, label: item } : item
  );

  const [inner, setInner] = useState<string>(defaultValue ?? list[0]?.value ?? '');
  const [isMeasured, setIsMeasured] = useState(false);
  const current = value !== undefined ? value : inner;
  const rawIndex = list.findIndex((item) => item.value === current);
  const index = Math.max(0, rawIndex);

  const reduce = useReducedMotion();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slots = useRef<{ l: number; r: number }[]>([]);
  const box = useRef<DOMRect | null>(null);
  const committed = useRef(index);
  const handoff = useRef<NodeJS.Timeout | number>(0);
  const drag = useRef<{
    id: number;
    x0: number;
    slot: number;
    onThumb: boolean;
    live: boolean;
    offset: number;
    w: number;
    hist: [number, number][];
  } | null>(null);
  const gen = useRef(0);

  const edgeL = useMotionValue(0);
  const edgeR = useMotionValue(0);
  const innerW = useMotionValue(0);
  const thumbRadius = Math.max(0, radius - inset);

  // Transform using [innerW, edgeL, edgeR] array to ensure dynamic tracking
  const clipPath = useTransform(
    [innerW, edgeL, edgeR],
    ([w, l, r]) => {
      const rightInset = Math.max(0, Number(w) - Number(r));
      const leftInset = Math.max(0, Number(l));
      return `inset(0 ${rightInset}px 0 ${leftInset}px round ${thumbRadius}px)`;
    }
  );

  const t = useCallback((seconds: number) => seconds / speed, [speed]);

  const jumpTo = useCallback((i: number) => {
    const s = slots.current[i];
    if (!s) return;
    clearTimeout(handoff.current);
    gen.current += 1;
    edgeL.jump(s.l);
    edgeR.jump(s.r);
  }, [edgeL, edgeR]);

  const land = useCallback((to: number, v: number | null, flick: boolean, withSquash: boolean) => {
    const b = slots.current[to];
    if (!b) return;
    const g = ++gen.current;
    const currentCenter = (edgeL.get() + edgeR.get()) / 2;
    const targetCenter = (b.l + b.r) / 2;
    const dir = Math.sign(targetCenter - currentCenter) || 1;
    const [lead, leadTo, trail, trailTo] = dir > 0 ? [edgeR, b.r, edgeL, b.l] : [edgeL, b.l, edgeR, b.r];
    const velocityFor = (mv: typeof edgeL) =>
      clamp(v === null ? mv.getVelocity() : v, -MAX_VELOCITY, MAX_VELOCITY);

    animate(lead, leadTo, {
      ...(flick ? SPRING_MOMENTUM : SPRING_UI),
      duration: t(flick ? 0.4 : 0.3),
      velocity: velocityFor(lead),
    });

    const trailVelocity = velocityFor(trail);
    if (!withSquash || squash <= 0) {
      animate(trail, trailTo, { ...SPRING_UI, duration: t(0.3), velocity: trailVelocity });
      return;
    }

    animate(trail, trailTo + dir * squash, { ...SPRING_UI, duration: t(0.3), velocity: trailVelocity }).then(() => {
      if (gen.current === g) {
        animate(trail, trailTo, { ...SPRING_RELAX, duration: t(0.16) });
      }
    });
  }, [edgeL, edgeR, squash, t]);

  const travel = useCallback((from: number, to: number) => {
    const a = slots.current[from];
    const b = slots.current[to];
    if (!a || !b) return;
    clearTimeout(handoff.current);
    gen.current += 1;
    if (reduce) {
      edgeL.jump(b.l);
      edgeR.jump(b.r);
      return;
    }
    const u = stretch / 100;
    const tween = { duration: t(DILATE), ease: EASE_OUT };
    animate(edgeL, b.l + (Math.min(a.l, b.l) - b.l) * u, tween);
    animate(edgeR, b.r + (Math.max(a.r, b.r) - b.r) * u, tween);
    handoff.current = setTimeout(() => land(to, null, false, true), t(HANDOFF) * 1000);
  }, [edgeL, edgeR, land, reduce, stretch, t]);

  const commit = useCallback((i: number) => {
    committed.current = i;
    if (i === index) return;
    if (value === undefined) setInner(list[i].value);
    onChange?.(list[i].value, i);
  }, [index, list, onChange, value, setInner]);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    if (rect.width === 0) return;
    box.current = rect;
    slots.current = list.map((_, i) => {
      const el = itemRefs.current[i];
      if (!el) return { l: 0, r: 0 };
      const r = el.getBoundingClientRect();
      return { l: r.left - rect.left - inset, r: r.right - rect.left - inset };
    });
    innerW.set(rect.width - inset * 2);
    jumpTo(committed.current);
    setIsMeasured(true);
  }, [inset, innerW, jumpTo, list, setIsMeasured]);

  const listKey = list.map((item) => item.value).join('|');

  useIsomorphicLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (trackRef.current) observer.observe(trackRef.current);
    if (typeof document !== 'undefined' && document.fonts) {
      document.fonts.ready.then(measure);
    }
    return () => observer.disconnect();
  }, [listKey, size, inset, equalSlots, measure]);

  useEffect(() => {
    if (!drag.current && committed.current !== index) {
      const prev = committed.current;
      committed.current = index;
      if (slots.current.length > 0 && slots.current[index]) {
        travel(prev, index);
      } else {
        jumpTo(index);
      }
    }
  }, [index, jumpTo, travel]);

  useEffect(
    () => () => {
      clearTimeout(handoff.current);
      edgeL.stop();
      edgeR.stop();
    },
    [edgeL, edgeR]
  );

  const localX = (e: React.PointerEvent) => e.clientX - (box.current ? box.current.left : 0) - inset;

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>, i: number) => {
    if (disabled || drag.current || e.button !== 0) return;
    box.current = trackRef.current ? trackRef.current.getBoundingClientRect() : null;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    const x = localX(e);
    const onThumb = draggable && x >= edgeL.get() && x <= edgeR.get();
    drag.current = {
      id: e.pointerId,
      x0: x,
      slot: i,
      onThumb,
      live: false,
      offset: 0,
      w: 0,
      hist: [[e.timeStamp, x]],
    };
    if (onThumb) {
      clearTimeout(handoff.current);
      gen.current += 1;
      edgeL.stop();
      edgeR.stop();
    } else if (!reduce) {
      e.currentTarget.dataset.pressed = '';
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id || !d.onThumb) return;
    const x = localX(e);
    d.hist.push([e.timeStamp, x]);
    if (d.hist.length > 8) d.hist.shift();
    if (!d.live) {
      if (Math.abs(x - d.x0) < DEADZONE) return;
      d.live = true;
      d.offset = x - edgeL.get();
      d.w = edgeR.get() - edgeL.get();
      if (trackRef.current) trackRef.current.dataset.held = '';
    }
    const width = innerW.get();
    const l = x - d.offset;
    const maxL = width - d.w;
    if (reduce) {
      const c = clamp(l, 0, maxL);
      edgeL.set(c);
      edgeR.set(c + d.w);
    } else if (l < 0) {
      edgeL.set(0);
      edgeR.set(d.w - rubber(-l, d.w));
    } else if (l > maxL) {
      edgeR.set(width);
      edgeL.set(maxL + rubber(l - maxL, d.w));
    } else {
      edgeL.set(l);
      edgeR.set(l + d.w);
    }
  };

  const release = () => {
    const d = drag.current;
    drag.current = null;
    if (trackRef.current) delete trackRef.current.dataset.held;
    if (d) {
      const el = itemRefs.current[d.slot];
      if (el) delete el.dataset.pressed;
    }
    return d;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    release();
    const x = localX(e);
    if (!d.live) {
      if (Math.abs(x - d.x0) <= SLOP && d.slot !== committed.current) {
        const from = committed.current;
        commit(d.slot);
        travel(from, d.slot);
      }
      return;
    }
    const v = velocityOf(d.hist, e.timeStamp);
    const flick = Math.abs(v) > FLICK;
    let to = nearestSlot(slots.current, (edgeL.get() + edgeR.get()) / 2 + project(v, glide));
    if (flick && to === committed.current) to = clamp(to + Math.sign(v), 0, list.length - 1);
    commit(to);
    if (reduce) jumpTo(to);
    else land(to, v, flick, flick);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    release();
    if (!d.live) return;
    if (reduce) jumpTo(committed.current);
    else land(committed.current, null, false, false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    const last = list.length - 1;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(last, index + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    if (next === index) return;
    const from = index;
    commit(next);
    travel(from, next);
    itemRefs.current[next]?.focus();
  };

  const preset = SIZES[size] || SIZES.md;

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label={effectiveAriaLabel}
      aria-disabled={disabled || undefined}
      data-equal={equalSlots ? '' : undefined}
      data-draggable={draggable && !disabled ? '' : undefined}
      className={`rubber-segment${className ? ` ${className}` : ''}`}
      style={
        {
          '--rs-track': trackColor,
          '--rs-thumb': thumbColor,
          '--rs-ink': textColor,
          '--rs-ink-active': activeTextColor,
          '--rs-radius': `${radius}px`,
          '--rs-inset': `${inset}px`,
          '--rs-thumb-radius': `${thumbRadius}px`,
          '--rs-h': `${preset.height}px`,
          '--rs-font': `${preset.font}px`,
          '--rs-pad': `${preset.pad}px`,
          '--rs-min': `${preset.min}px`,
        } as React.CSSProperties
      }
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handlePointerCancel}
    >
      {list.map((item, i) => (
        <button
          key={item.value}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={i === index}
          tabIndex={i === index ? 0 : -1}
          disabled={disabled}
          className="rubber-segment__item"
          onPointerDown={(e) => handlePointerDown(e, i)}
          onKeyDown={handleKeyDown}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}

      <motion.div
        className="rubber-segment__thumb"
        aria-hidden="true"
        style={{
          clipPath,
          opacity: isMeasured ? 1 : 0,
          transition: 'opacity 120ms ease',
        }}
      >
        {list.map((item) => (
          <span key={item.value} className="rubber-segment__item rubber-segment__copy">
            {item.icon}
            <span>{item.label}</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
