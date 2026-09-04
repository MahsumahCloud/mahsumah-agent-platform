import { build } from "esbuild";
import path from "node:path";

build({
  entryPoints: [path.join(process.cwd(), "src/widgets/embed/widget.ts")],
  outfile: path.join(process.cwd(), "public/widget.js"),
  bundle: true,
  minify: true,
  format: "iife",
  target: ["es2019"],
  legalComments: "none",
}).then(() => console.log("✔ public/widget.js built")).catch((e) => { console.error(e); process.exit(1); });
