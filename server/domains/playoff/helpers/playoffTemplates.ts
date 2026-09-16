import q16 from "../templates/16q.json";
import q16lb from "../templates/16q-lb.json";
import q12pi8 from "../templates/12q-8pi.json";
import q12pi8lb from "../templates/12q-8pi-lb.json";
import q28 from "../templates/28q.json";
import q12lb from "../templates/12q-lb.json";
import q12lbSAS2 from "../templates/12q-lb-SA-S2.json";
import { PlayoffTemplate } from "../types";

export const templates = {
  "16q": q16 as PlayoffTemplate,
  "16q-lb": q16lb as PlayoffTemplate,
  "12q-lb": q12lb as PlayoffTemplate,
  "12q-lb-SA-S2": q12lbSAS2 as PlayoffTemplate,
  "12q-8pi": q12pi8 as PlayoffTemplate,
  "12q-8pi-lb": q12pi8lb as PlayoffTemplate,
  "28q": q28 as PlayoffTemplate,
} satisfies Record<string, PlayoffTemplate>;