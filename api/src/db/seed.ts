import { faker } from "@faker-js/faker";
import { sql } from "drizzle-orm";
import { db, pool } from "./index.ts";
import { manufacturers, materialStatusEnum, materials, plants } from "./schema.ts";

type NewMaterial = typeof materials.$inferInsert;

const BATCH_SIZE = 1000;

// A fixed "now" keeps updatedAt identical on every run; using the real clock would shift all dates daily.
const REF_DATE = new Date("2026-11-01T00:00:00Z");

const PLANTS = [
  { code: "1000", name: "Brisbane" },
  { code: "1100", name: "Sydney" },
  { code: "1200", name: "Melbourne" },
  { code: "1300", name: "Perth" },
  { code: "1400", name: "Adelaide" },
  { code: "1500", name: "Gladstone" },
  { code: "1600", name: "Newcastle" },
  { code: "1700", name: "Hobart" },
];

// Each kind of item is paired with makers that really sell it, so searches like "SKF bearing" make sense.
// In `mpn` patterns, # becomes a digit and ? a letter (faker.helpers.replaceSymbols).
type Template = {
  type: NewMaterial["type"];
  uom: "EA" | "KG" | "M" | "PK";
  makers: string[];
  price: [number, number];
  maxStock: number;
  mpn: string;
  describe: () => string;
};

const pick = faker.helpers.arrayElement;

const TEMPLATES: Template[] = [
  // Spare parts
  {
    type: "Spare Part", uom: "EA", makers: ["SKF", "NSK", "Timken", "FAG"],
    price: [15, 450], maxStock: 200, mpn: "BR-#####",
    describe: () =>
      `${pick(["Deep groove ball", "Spherical roller", "Tapered roller", "Cylindrical roller"])} bearing ${pick([20, 25, 30, 35, 40, 50, 60])}mm bore`,
  },
  {
    type: "Spare Part", uom: "EA", makers: ["Gates", "Optibelt", "Continental"],
    price: [12, 180], maxStock: 150, mpn: "VB-####",
    describe: () => `V-belt ${pick(["SPA", "SPB", "SPC", "SPZ"])} ${faker.number.int({ min: 10, max: 45 }) * 100}mm`,
  },
  {
    type: "Spare Part", uom: "EA", makers: ["John Crane", "EagleBurgmann", "Flowserve"],
    price: [250, 3500], maxStock: 20, mpn: "MS-###-??",
    describe: () => `Mechanical seal ${pick(["single cartridge", "double cartridge", "split"])} ${pick([35, 45, 55, 65, 75])}mm shaft`,
  },
  {
    type: "Spare Part", uom: "EA", makers: ["ABB", "WEG", "Siemens"],
    price: [800, 12000], maxStock: 6, mpn: "MTR-###-??",
    describe: () => `Electric motor ${pick([1.5, 3, 5.5, 7.5, 11, 15, 22, 37])}kW ${pick([2, 4, 6])}-pole IE3`,
  },
  {
    type: "Spare Part", uom: "EA", makers: ["Schneider Electric", "ABB", "Siemens"],
    price: [60, 900], maxStock: 40, mpn: "CT-##-??",
    describe: () => `${pick(["Contactor", "Motor circuit breaker", "Overload relay"])} ${pick([9, 18, 25, 32, 40, 65])}A`,
  },
  {
    type: "Spare Part", uom: "M", makers: ["Parker", "Gates", "Manuli"],
    price: [15, 90], maxStock: 300, mpn: "HH-##-#?",
    describe: () => `Hydraulic hose ${pick(["2-wire", "4-spiral"])} ${pick(["1/4", "3/8", "1/2", "3/4", "1"])} inch`,
  },
  {
    type: "Spare Part", uom: "EA", makers: ["ifm", "Sick", "Pepperl+Fuchs"],
    price: [80, 600], maxStock: 50, mpn: "PX-####",
    describe: () => `${pick(["Inductive proximity", "Photoelectric", "Capacitive"])} sensor M${pick([12, 18, 30])} PNP`,
  },
  {
    type: "Spare Part", uom: "EA", makers: ["Weir Minerals", "KSB"],
    price: [1500, 18000], maxStock: 4, mpn: "F####?",
    describe: () => `Slurry pump ${pick(["impeller", "throatbush", "frame plate liner"])} ${pick(["4/3", "6/4", "8/6", "10/8"])}`,
  },

  // Consumables
  {
    type: "Consumable", uom: "KG", makers: ["Castrol", "Shell", "Mobil"],
    price: [12, 60], maxStock: 500, mpn: "GR-####",
    describe: () => `${pick(["Lithium complex", "Calcium sulphonate", "Polyurea"])} grease NLGI ${pick([1, 2, 3])}`,
  },
  {
    type: "Consumable", uom: "EA", makers: ["Castrol", "Shell", "Mobil"],
    price: [90, 1400], maxStock: 60, mpn: "OIL-###-##",
    describe: () =>
      `${pick(["Hydraulic oil ISO VG 46", "Hydraulic oil ISO VG 68", "Gear oil ISO VG 220", "Engine oil 15W-40"])} ${pick(["20L pail", "205L drum"])}`,
  },
  {
    type: "Consumable", uom: "EA", makers: ["Donaldson", "Parker", "Pall"],
    price: [30, 400], maxStock: 120, mpn: "FE-######",
    describe: () => `${pick(["Hydraulic", "Air", "Fuel", "Lube oil"])} filter element ${pick([3, 10, 25])} micron`,
  },
  {
    type: "Consumable", uom: "PK", makers: ["Lincoln Electric", "ESAB", "WIA"],
    price: [40, 160], maxStock: 80, mpn: "WE-####",
    describe: () => `Welding electrodes ${pick(["E7018", "E6013", "E316L"])} ${pick([2.5, 3.2, 4.0])}mm 5kg pack`,
  },
  {
    type: "Consumable", uom: "PK", makers: ["3M", "Norton", "Pferd"],
    price: [25, 120], maxStock: 100, mpn: "CD-###-#",
    describe: () => `${pick(["Cutting", "Grinding", "Flap"])} disc ${pick([115, 125, 180, 230])}mm pack of 25`,
  },
  {
    type: "Consumable", uom: "PK", makers: ["HellermannTyton", "Panduit"],
    price: [8, 60], maxStock: 200, mpn: "T##R-##",
    describe: () => `Cable ties ${pick(["nylon", "UV stabilised", "stainless"])} ${pick([200, 300, 370, 540])}mm pack of 100`,
  },
  {
    type: "Consumable", uom: "PK", makers: ["Ansell", "Honeywell"],
    price: [15, 90], maxStock: 150, mpn: "##-###",
    describe: () => `${pick(["Cut resistant", "Nitrile", "Chemical resistant"])} safety gloves size ${pick([8, 9, 10, 11])} pack of 12`,
  },

  // Raw materials
  {
    type: "Raw Material", uom: "KG", makers: ["BlueScope", "Bisalloy", "InfraBuild"],
    price: [2, 9], maxStock: 5000, mpn: "PL-##-###",
    describe: () => `${pick(["Mild steel plate Grade 250", "Wear plate Grade 400", "High tensile plate Grade 350"])} ${pick([6, 8, 10, 12, 16, 20])}mm`,
  },
  {
    type: "Raw Material", uom: "M", makers: ["InfraBuild", "Orrcon Steel"],
    price: [8, 120], maxStock: 600, mpn: "ST-###-##",
    describe: () => `${pick(["Square hollow section", "Rectangular hollow section", "Round bar", "Equal angle"])} ${pick([50, 65, 75, 100, 150])}mm`,
  },
  {
    type: "Raw Material", uom: "M", makers: ["Prysmian", "Olex", "Nexans"],
    price: [3, 85], maxStock: 2000, mpn: "XLPE-#C-##",
    describe: () => `Copper power cable ${pick([2, 3, 4])} core ${pick([2.5, 4, 6, 16, 35, 70])}mm² XLPE`,
  },
  {
    type: "Raw Material", uom: "KG", makers: ["Capral", "Ullrich Aluminium"],
    price: [6, 20], maxStock: 1500, mpn: "AL-####-#",
    describe: () => `Aluminium sheet ${pick(["5083", "5052", "6061"])} ${pick([1.6, 3, 5, 6, 10])}mm`,
  },
  {
    type: "Raw Material", uom: "M", makers: ["Outokumpu", "Sandvik"],
    price: [25, 250], maxStock: 400, mpn: "SS###-##",
    describe: () => `Stainless steel pipe ${pick(["304", "316L"])} ${pick(["DN25", "DN50", "DN80", "DN100"])} Sch ${pick([10, 40])}`,
  },
  {
    type: "Raw Material", uom: "M", makers: ["Fenner Dunlop", "Continental"],
    price: [120, 900], maxStock: 150, mpn: "CB-####-?",
    describe: () => `Conveyor belting ${pick(["PN800", "PN1000", "ST1600"])} ${pick([900, 1050, 1200, 1400])}mm wide`,
  },

  // Tools
  {
    type: "Tool", uom: "EA", makers: ["Snap-on", "Norbar", "Stahlwille"],
    price: [180, 1400], maxStock: 10, mpn: "TW-###",
    describe: () => `Torque wrench ${pick(["1/4", "3/8", "1/2", "3/4"])} inch drive ${pick([25, 60, 200, 350, 800])}Nm`,
  },
  {
    type: "Tool", uom: "EA", makers: ["Milwaukee", "Makita", "DeWalt"],
    price: [150, 800], maxStock: 15, mpn: "PT-????",
    describe: () => `Cordless ${pick(["drill driver", "impact wrench", "angle grinder", "reciprocating saw"])} 18V`,
  },
  {
    type: "Tool", uom: "EA", makers: ["Fluke", "Hioki"],
    price: [120, 1200], maxStock: 10, mpn: "TM-###",
    describe: () => `${pick(["Digital multimeter", "Clamp meter", "Insulation tester"])} CAT ${pick(["III", "IV"])}`,
  },
  {
    type: "Tool", uom: "EA", makers: ["Snap-on", "Kincrome", "Sidchrome"],
    price: [90, 1500], maxStock: 12, mpn: "K####",
    describe: () => `Socket set ${pick(["1/4", "3/8", "1/2"])} inch drive ${pick([24, 42, 64, 98])} piece`,
  },
  {
    type: "Tool", uom: "EA", makers: ["Enerpac", "SKF"],
    price: [300, 4000], maxStock: 5, mpn: "BHP-###",
    describe: () => `Hydraulic ${pick(["bearing puller", "cylinder", "hand pump"])} ${pick([5, 10, 20, 30, 50])}t`,
  },
];

// Roughly what a real SAP catalogue looks like: mostly active, some retired, a few awaiting review.
const STATUS_WEIGHTS: { weight: number; value: (typeof materialStatusEnum.enumValues)[number] }[] = [
  { weight: 75, value: "Active" },
  { weight: 15, value: "Obsolete" },
  { weight: 10, value: "Pending Review" },
];

function readSeedCount(): number {
  const raw = process.env.SEED_COUNT ?? "20000";
  const count = Number(raw);
  if (!Number.isInteger(count) || count < 1) {
    throw new Error(`SEED_COUNT must be a positive integer, got "${raw}".`);
  }
  return count;
}

function buildMaterial(
  n: number,
  plantIds: number[],
  manufacturerIds: Map<string, number>,
): NewMaterial {
  const template = pick(TEMPLATES);
  const maker = pick(template.makers);
  const [min, max] = template.price;

  return {
    materialNumber: `MAT-${String(n).padStart(6, "0")}`,
    description: template.describe(),
    type: template.type,
    status: faker.helpers.weightedArrayElement(STATUS_WEIGHTS),
    // Every maker in TEMPLATES was inserted first, so the lookup cannot miss.
    manufacturerId: manufacturerIds.get(maker)!,
    mpn: faker.helpers.replaceSymbols(template.mpn),
    plantId: pick(plantIds),
    uom: template.uom,
    // Keep money as a string so numeric(12,2) gets the exact value.
    unitPrice: faker.commerce.price({ min, max, dec: 2 }),
    stockQty: faker.number.int({ min: 0, max: template.maxStock }),
    updatedAt: faker.date.past({ years: 2, refDate: REF_DATE }),
  };
}

async function seed() {
  const count = readSeedCount();
  const started = performance.now();
  faker.seed(42);

  // One transaction, so a failed run leaves the previous data in place instead of half a catalogue.
  await db.transaction(async (tx) => {
    await tx.execute(sql`TRUNCATE materials, manufacturers, plants RESTART IDENTITY CASCADE`);

    const plantRows = await tx.insert(plants).values(PLANTS).returning({ id: plants.id });
    const plantIds = plantRows.map((row) => row.id);

    // Sorted so manufacturer ids do not depend on template order.
    const makerNames = [...new Set(TEMPLATES.flatMap((t) => t.makers))].sort();
    const makerRows = await tx
      .insert(manufacturers)
      .values(makerNames.map((name) => ({ name })))
      .returning({ id: manufacturers.id, name: manufacturers.name });
    const manufacturerIds = new Map(makerRows.map((row) => [row.name, row.id]));
    console.log(`Inserted ${plantIds.length} plants and ${manufacturerIds.size} manufacturers`);

    // Batches keep each INSERT well under Postgres's 65,535 parameter limit (1,000 rows x 11 columns).
    for (let start = 1; start <= count; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, count);
      const batch: NewMaterial[] = [];
      for (let n = start; n <= end; n++) {
        batch.push(buildMaterial(n, plantIds, manufacturerIds));
      }
      await tx.insert(materials).values(batch);
      console.log(`Inserted materials ${start} to ${end}`);
    }
  });

  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(`Seeded ${count} materials in ${seconds}s`);
}

seed()
  .catch((error: unknown) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
