import type { ProductProfileInput } from "@/types";
import { mahsumaOrganization } from "./organization";
import { mahsumaMain } from "./mahsuma-main";
import { mahsumaCloud } from "./mahsuma-cloud";
import { mahsumaDcc } from "./mahsuma-dcc";
import { mahsumaMoto } from "./mahsuma-moto";

/** Seed profiles. Runtime source of truth is the database; these are applied by `npm run db:seed`. */
export const seedProducts: ProductProfileInput[] = [mahsumaOrganization, mahsumaMain, mahsumaCloud, mahsumaDcc, mahsumaMoto];
