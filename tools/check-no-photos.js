#!/usr/bin/env node
/*
 * Refuse to ship a photograph.
 *
 *   node tools/check-no-photos.js
 *
 * source/ holds photographs of the rulebook and every card in the box. This
 * repo is public. The rules ship as engine behaviour and the cards as
 * transcribed data; the photographs themselves never leave the machine they
 * were taken on.
 *
 * A .gitignore line is not enough, and PumaRally learned why: a pattern
 * ending in a slash matches a DIRECTORY, which a symlink is not, so a
 * worktree that links to the one copy of source/ shows it to `git add -A`
 * as an ordinary untracked path. So this checks the thing that matters
 * rather than the mechanism meant to achieve it: nothing under source/ (or
 * sources/) is tracked, staged, or sitting in the tree unignored -- and no
 * camera image is tracked anywhere at all.
 *
 * It runs first in CI, against the fresh clone, which is exactly what the
 * public gets.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
/* The photograph folders, as a bare name (the symlink case) or a path under it. */
const SECRET = /^sources?(\/|$)/;
/* A camera's output, anywhere. The game's own images are PNG and SVG. */
const CAMERA = /\.(jpe?g|heic|heif|dng)$/i;

function git(args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    return null;
  }
}

let failed = 0;
function refuse(what, paths) {
  console.error(`  error:   ${what}:`);
  for (const p of paths.slice(0, 10)) console.error(`             ${p}`);
  if (paths.length > 10) console.error(`             ...and ${paths.length - 10} more`);
  failed++;
}

const tracked = git(["ls-files"]);
if (tracked === null) {
  /* A check that checks nothing must never read as a pass. */
  if (fs.existsSync(path.join(ROOT, ".git"))) {
    console.error("no-photo check: this is a git checkout but git could not be run; install git (the CI image needs it) -- refusing to pass vacuously");
    process.exit(1);
  }
  console.log("no-photo check: not a git checkout, nothing to check");
  process.exit(0);
}

const files = tracked.split("\n").filter(Boolean);
if (files.length === 0) {
  console.error("no-photo check: git lists no tracked files at all -- refusing to pass vacuously");
  process.exit(1);
}
const bad = files.filter(p => SECRET.test(p));
if (bad.length) refuse("photographs are TRACKED in this repo, which is public", bad);
const cam = files.filter(p => CAMERA.test(p));
if (cam.length) refuse("camera images are TRACKED (the game ships no JPEG or HEIC)", cam);

const staged = git(["diff", "--cached", "--name-only"]);
if (staged) {
  const s = staged.split("\n").filter(Boolean).filter(p => SECRET.test(p) || CAMERA.test(p));
  if (s.length) refuse("photographs are STAGED for commit", s);
}

const status = git(["status", "--porcelain", "--untracked-files=normal"]);
if (status) {
  const vis = status.split("\n").filter(Boolean)
    .map(l => l.slice(3).replace(/^"|"$/g, ""))
    .filter(p => SECRET.test(p) || CAMERA.test(p));
  if (vis.length) {
    refuse("photograph paths are visible to git despite .gitignore " +
           "(a pattern ending in / does not match a symlink)", vis);
  }
}

if (failed) {
  console.error(`\n${failed} problem(s). Nothing under source/ may enter this repo.`);
  process.exit(1);
}
console.log(`no-photo check: ${files.length} tracked files, nothing under source/ and no camera image tracked, staged or visible`);
