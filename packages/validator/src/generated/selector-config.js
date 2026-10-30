import * as snapshot1 from "../snapshots/0.9.0-draft.3/index.js";
import * as snapshot2 from "../snapshots/0.9.0-draft.2/index.js";
import * as snapshot3 from "../snapshots/0.9.0-draft.1/index.js";
import * as snapshot4 from "../snapshots/0.8.0-rc.4/index.js";
import * as snapshot5 from "../snapshots/0.8.0/index.js";
import * as snapshot6 from "../snapshots/0.8.0-rev.20261021/index.js";
import { resolveComponentReferences as resolveComponentReferences1 } from "../snapshots/0.9.0-draft.3/semantic.js";
import { resolveComponentReferences as resolveComponentReferences2 } from "../snapshots/0.9.0-draft.2/semantic.js";
import { resolveComponentReferences as resolveComponentReferences3 } from "../snapshots/0.9.0-draft.1/semantic.js";
import { resolveComponentReferences as resolveComponentReferences4 } from "../snapshots/0.8.0-rc.4/semantic.js";
import { resolveComponentReferences as resolveComponentReferences5 } from "../snapshots/0.8.0/semantic.js";
import { resolveComponentReferences as resolveComponentReferences6 } from "../snapshots/0.8.0-rev.20261021/semantic.js";

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
      "defaultSelector": "0.8.0-rev.20261021",
      "schemaPins": false
    }
  },
  "selectors": {
    "0.9.0-draft.3": {
      "formatVersion": "0.9.0",
      "lifecycle": "active",
      "specificationTag": "v0.9.0-draft.3",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.9.0-draft.3.json",
      "schemaSha256": "b81249f92c0583fd996a6eefa0928d0a29e012a5b8fbda9af580cf164ab8654d"
    },
    "0.9.0-draft.2": {
      "formatVersion": "0.9.0",
      "lifecycle": "active",
      "specificationTag": "v0.9.0-draft.2",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.9.0-draft.2.json",
      "schemaSha256": "b3405c551db68f5a4efc625809b884d17bb248aba4d57b87463450ebf83efac6"
    },
    "0.9.0-draft.1": {
      "formatVersion": "0.9.0",
      "lifecycle": "active",
      "specificationTag": "v0.9.0-draft.1",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.9.0-draft.1.json",
      "schemaSha256": "058e1fe3c976a41588ec81b9c8c17400f868698d8bd154ef5755cc69a4494c74"
    },
    "0.8.0-rc.4": {
      "formatVersion": "0.8.0",
      "lifecycle": "deprecated",
      "specificationTag": "v0.8.0-rc.4",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.4.json",
      "schemaSha256": "d38e54db859813b63be2a5c91dde91250035f18bcb5910208cf71fa6875d6eef"
    },
    "0.8.0": {
      "formatVersion": "0.8.0",
      "lifecycle": "deprecated",
      "specificationTag": "v0.8.0",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0.json",
      "schemaSha256": "36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119"
    },
    "0.8.0-rev.20261021": {
      "formatVersion": "0.8.0",
      "lifecycle": "active",
      "specificationTag": "v0.8.0-rev.20261021",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0.json",
      "schemaSha256": "36686f92ba0cc98bde2c34eaad31c0304d6e5cebdd2c4d2be1be06aecef41119"
    },
    "0.8.0-draft.1": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-draft.1",
      "schemaUri": "https://mcpdesc.org/schema/0.8.0.json",
      "schemaSha256": "4ceb6042c3fd31703199cd3db869ec5c35c17d2fe9ab7b2f5b96a2a3af0cebe4"
    },
    "0.8.0-draft.2": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-draft.2",
      "schemaUri": "https://mcpdesc.org/schema/0.8.0.json",
      "schemaSha256": "ab692c1a5a0f7e5f29be1940aa8c64a56d4620be0a19d00cf0a64680b7e517fa"
    },
    "0.8.0-draft.3": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-draft.3",
      "schemaUri": "https://mcpdesc.org/schema/0.8.0.json",
      "schemaSha256": "8823c1f1946360b2a44d00920e2092e5e4acd139a1964befad4eb0bf3ce96002"
    },
    "0.8.0-draft.4": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-draft.4",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-draft.4.json",
      "schemaSha256": "93ed03f74059b5b3ce7509a96b59161bdab2c3cf7734397a9bec5a7588d0b03b"
    },
    "0.8.0-rc.1": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-rc.1",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.1.json",
      "schemaSha256": "936a0f24ade501fcabf3d6498c0440c445daa672a575573a35954cee49430ac4"
    },
    "0.8.0-rc.2": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-rc.2",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.2.json",
      "schemaSha256": "40f6775dde052224114e91d6aa484d826eecf56b77f7ac87b4cf707ffbcb6ce8"
    },
    "0.8.0-rc.3": {
      "formatVersion": "0.8.0",
      "lifecycle": "retired",
      "specificationTag": "v0.8.0-rc.3",
      "schemaUri": "https://mcpdesc.org/schema/mcp-description/0.8.0-rc.3.json",
      "schemaSha256": "a9c3ff77ba37c72362909f538f6e957d055e6fdb372f8b3d529e3651af3fecf4"
    }
  }
});

export const snapshotImplementations = Object.freeze({
  "0.9.0-draft.3": snapshot1,
  "0.9.0-draft.2": snapshot2,
  "0.9.0-draft.1": snapshot3,
  "0.8.0-rc.4": snapshot4,
  "0.8.0": snapshot5,
  "0.8.0-rev.20261021": snapshot6,
});

export const componentResolvers = Object.freeze({
  "0.9.0-draft.3": resolveComponentReferences1,
  "0.9.0-draft.2": resolveComponentReferences2,
  "0.9.0-draft.1": resolveComponentReferences3,
  "0.8.0-rc.4": resolveComponentReferences4,
  "0.8.0": resolveComponentReferences5,
  "0.8.0-rev.20261021": resolveComponentReferences6,
});
