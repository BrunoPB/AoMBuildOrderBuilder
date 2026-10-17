import { readFileSync } from "node:fs";
import { z } from "zod";
import {
  CommonSchema,
  MajorGodSchema,
  MinorGodSchema,
  PantheonSchema,
  PowersFileSchema,
  ResourcesFileSchema,
  SourcesFileSchema,
} from "../src/data/schema.ts";

const schemas: Record<string, z.ZodType> = {
  common: CommonSchema,
  resources: ResourcesFileSchema,
  sources: SourcesFileSchema,
  pantheon: PantheonSchema,
  god: MajorGodSchema,
  minor: MinorGodSchema,
  powers: PowersFileSchema,
};

const [kind, ...files] = process.argv.slice(2);
const schema = kind ? schemas[kind] : undefined;
if (!schema || files.length === 0) {
  console.error(`usage: tsx scripts/validate-file.ts <${Object.keys(schemas).join("|")}> <file...>`);
  process.exit(2);
}

let failed = false;
for (const file of files) {
  const result = schema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (result.success) {
    console.log(`ok   ${file}`);
  } else {
    failed = true;
    console.log(`FAIL ${file}\n${z.prettifyError(result.error)}`);
  }
}
process.exit(failed ? 1 : 0);
