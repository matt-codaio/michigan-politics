import assert from "node:assert/strict";
import { test } from "node:test";
import { candidateMergeKey, mergeCandidates } from "../src/elections/names.ts";

test("strips DEM/REP prefixes and middle initials for the same person", () => {
  assert.equal(candidateMergeKey("Elissa Slotkin", "D"), candidateMergeKey("DEM Elissa Slotkin", "D"));
  assert.equal(candidateMergeKey("Mike Rogers", "R"), candidateMergeKey("REP Mike Rogers", "R"));
  assert.equal(
    candidateMergeKey("Kamala D. Harris", "D"),
    candidateMergeKey("Kamala Harris", "D"),
  );
  assert.equal(
    candidateMergeKey("DEM Kamala D. Harris", "D"),
    candidateMergeKey("Kamala Harris", "D"),
  );
});

test("merges split statewide rows and sums votes", () => {
  const merged = mergeCandidates([
    { name: "Mike Rogers", party: "R", votes: 2_634_269, sourceUrl: "https://example.invalid/a" },
    { name: "Elissa Slotkin", party: "D", votes: 2_628_265, sourceUrl: "https://example.invalid/a" },
    { name: "DEM Elissa Slotkin", party: "D", votes: 81_996, sourceUrl: "https://example.invalid/b" },
    { name: "REP Mike Rogers", party: "R", votes: 57_478, sourceUrl: "https://example.invalid/b" },
  ]);
  assert.equal(merged.length, 2);
  const rogers = merged.find((row) => row.party === "R");
  const slotkin = merged.find((row) => row.party === "D");
  assert.equal(rogers?.votes, 2_691_747);
  assert.equal(slotkin?.votes, 2_710_261);
  assert.equal(rogers?.name, "Mike Rogers");
  assert.equal(slotkin?.name, "Elissa Slotkin");
});

test("collapses Harris / Trump ticket variants", () => {
  const merged = mergeCandidates([
    { name: "Kamala D. Harris", party: "D", votes: 2_531_476, sourceUrl: "" },
    { name: "Donald J. Trump", party: "R", votes: 2_420_168, sourceUrl: "" },
    { name: "Donald J. Trump/J. D. Vance", party: "R", votes: 337_791, sourceUrl: "" },
    { name: "Kamala Harris", party: "D", votes: 120_545, sourceUrl: "" },
    { name: "DEM Kamala D. Harris", party: "D", votes: 84_501, sourceUrl: "" },
    { name: "REP Donald J. Trump", party: "R", votes: 58_671, sourceUrl: "" },
  ]);
  assert.equal(merged.length, 2);
  const harris = merged.find((row) => row.party === "D");
  const trump = merged.find((row) => row.party === "R");
  assert.equal(harris?.votes, 2_736_522);
  assert.equal(trump?.votes, 2_816_630);
  assert.match(harris?.name ?? "", /Harris/);
  assert.match(trump?.name ?? "", /Trump/);
  assert.doesNotMatch(trump?.name ?? "", /Vance/);
});
