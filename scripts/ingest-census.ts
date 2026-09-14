import fs from "node:fs";
import {
  ACS_AS_OF,
  ACS_SOURCE_URL,
  ACS_VINTAGE_LABEL,
  loadMichiganAcs,
} from "./lib/acs.ts";
import {
  PEP_AS_OF,
  PEP_SOURCE_URL,
  PEP_VINTAGE_LABEL,
  loadMichiganPep,
} from "./lib/pep.ts";
import {
  CVAP_AS_OF,
  CVAP_SOURCE_URL,
  CVAP_VINTAGE_LABEL,
  loadMichiganCvap,
} from "./ingest-cvap.ts";
import { DEMOGRAPHICS_PATH, ensureDirs, loadDotEnv } from "./lib/paths.ts";
import type { DemographicsBundle, DemographicsFile } from "../src/types/demographics.ts";

async function main(): Promise<void> {
  loadDotEnv();
  ensureDirs();

  console.log("Downloading PEP county/state estimates…");
  const pep = await loadMichiganPep();
  console.log(`PEP geos: ${pep.size}`);

  console.log("Loading ACS 5-year age/race/education/income…");
  const acs = await loadMichiganAcs();
  console.log(`ACS geos: ${acs.size}`);

  console.log("Loading CVAP 2020–2024 special tabulation…");
  const cvap = await loadMichiganCvap();
  console.log(`CVAP geos: ${cvap.size}`);

  const geos: Record<string, DemographicsBundle> = {};
  for (const [geoId, pepGeo] of pep) {
    const acsGeo = acs.get(geoId);
    const cvapGeo = cvap.get(geoId);
    if (!acsGeo) throw new Error(`ACS missing ${geoId} (${pepGeo.name})`);
    if (!cvapGeo) throw new Error(`CVAP missing ${geoId} (${pepGeo.name})`);
    geos[geoId] = {
      geoId,
      name: pepGeo.name,
      population: pepGeo.population,
      ageShares: acsGeo.ageShares,
      raceShares: acsGeo.raceShares,
      educationShares: acsGeo.educationShares,
      incomeShares: acsGeo.incomeShares,
      cvapTotal: cvapGeo.cvapTotal,
      cvapByRace: cvapGeo.cvapByRace,
      asOf: PEP_AS_OF,
      sourceUrl: ACS_SOURCE_URL,
      vintages: {
        population: {
          asOf: PEP_AS_OF,
          sourceUrl: PEP_SOURCE_URL,
          vintageLabel: PEP_VINTAGE_LABEL,
        },
        acs: {
          asOf: ACS_AS_OF,
          sourceUrl: ACS_SOURCE_URL,
          vintageLabel: ACS_VINTAGE_LABEL,
        },
        cvap: {
          asOf: CVAP_AS_OF,
          sourceUrl: CVAP_SOURCE_URL,
          vintageLabel: CVAP_VINTAGE_LABEL,
        },
      },
    };
  }

  const file: DemographicsFile = {
    generatedAt: new Date().toISOString(),
    geos,
  };
  fs.writeFileSync(DEMOGRAPHICS_PATH, `${JSON.stringify(file)}\n`);
  const wayne = geos["26163"];
  const mi = geos["26"];
  console.log(`Wrote ${Object.keys(geos).length} geos → ${DEMOGRAPHICS_PATH}`);
  if (mi && wayne) {
    const miPop = mi.population.at(-1);
    const waynePop = wayne.population.at(-1);
    console.log(
      `Michigan ${miPop?.year}: ${miPop?.count.toLocaleString()} · Wayne ${waynePop?.year}: ${waynePop?.count.toLocaleString()} · Wayne CVAP ${wayne.cvapTotal.toLocaleString()}`,
    );
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
