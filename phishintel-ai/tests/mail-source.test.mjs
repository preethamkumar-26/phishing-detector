import test from "node:test";
import assert from "node:assert/strict";
import { classifyMailSource } from "../src/lib/mailSource.ts";

test("classifies Gmail from a raw .eml header block", () => {
  const headers = [
    "Delivered-To: analyst@example.com",
    "Received: by 2002:a05:620a:1022:b0: with SMTP id z2csp12345qkp;",
    "X-Google-Smtp-Source: AGHT+IEexample",
    "X-Gm-Message-State: AOJu0Yyexample",
  ].join("\r\n");

  assert.equal(classifyMailSource({ headers, from: "alerts@sender.example" }), "Gmail");
});

test("classifies structured and raw Outlook and Yahoo headers", () => {
  assert.equal(
    classifyMailSource({ headers: { "X-MS-Exchange-Organization-AuthAs": "Internal" } }),
    "Outlook",
  );
  assert.equal(
    classifyMailSource({ headers: "X-Yahoo-Newman-Property: ymail-3\nReceived: from mta6.am0.yahoodns.net" }),
    "Yahoo",
  );
});

test("uses the sender address only when transport headers are unavailable", () => {
  assert.equal(classifyMailSource({ headers: "", from: "person@gmail.com" }), "Gmail");
  assert.equal(classifyMailSource({ headers: "", from: "person@example.com" }), "Other");
});
