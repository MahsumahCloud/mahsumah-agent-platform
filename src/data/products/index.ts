import type { ProductProfileInput } from "@/types";
import { mahsumahOrganization } from "./organization";
import { mahsumahMain } from "./mahsumah-main";
import { mahsumahCloud } from "./mahsumah-cloud";
import { mahsumahDcc } from "./mahsumah-dcc";
import { mahsumahMoto } from "./mahsumah-moto";

/** Seed profiles. Runtime source of truth is the database; these are applied by `npm run db:seed`. */
export const seedProducts: ProductProfileInput[] = [mahsumahOrganization, mahsumahMain, mahsumahCloud, mahsumahDcc, mahsumahMoto];
