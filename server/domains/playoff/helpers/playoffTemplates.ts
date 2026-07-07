import q16 from "../templates/16q.json";
import q16lb from "../templates/16q-lb.json";
import q12pi8 from "../templates/12q-8pi.json";
import { PlayoffTemplate } from "../types";

export const templates = {
  "16q": q16 as PlayoffTemplate,
  "16q-lb": q16lb as PlayoffTemplate,
  "12q-8pi": q12pi8 as PlayoffTemplate,
} satisfies Record<string, PlayoffTemplate>;