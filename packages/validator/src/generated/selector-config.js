import * as snapshot1 from "../snapshots/0.8.0-rc.4/index.js";
import * as snapshot2 from "../snapshots/0.8.0/index.js";

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export const validatorConfiguration = deepFreeze({
  "configVersion": 1,
  "formats": {
    "0.8.0": {
      "defaultSelector": "0.8.0",
      "schemaPins": false
    }
  },
  "selectors": {
    "0.8.0-rc.4": {
      "formatVersion": "0.8.0",
      "lifecycle": "deprecated",
      "specificationTag": "v0.8.0-rc.4",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json"
    },
    "0.8.0": {
      "formatVersion": "0.8.0",
      "lifecycle": "active",
      "specificationTag": "v0.8.0",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0.json"
    },
    "0.8.0-draft.1": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-draft.1",
      "schemaUri": "https://mcpdesc.org/schema/0.8.0.json"
    },
    "0.8.0-draft.2": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-draft.2",
      "schemaUri": "https://mcpdesc.org/schema/0.8.0.json"
    },
    "0.8.0-draft.3": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-draft.3",
      "schemaUri": "https://mcpdesc.org/schema/0.8.0.json"
    },
    "0.8.0-draft.4": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-draft.4",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json"
    },
    "0.8.0-rc.1": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-rc.1",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json"
    },
    "0.8.0-rc.2": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-rc.2",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.2.json"
    },
    "0.8.0-rc.3": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-rc.3",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json"
    }
  }
});

export const snapshotImplementations = Object.freeze({
  "0.8.0-rc.4": snapshot1,
  "0.8.0": snapshot2,
});
