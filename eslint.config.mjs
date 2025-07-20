import { defineConfig } from "eslint/config";
import configs from "eslint-config-webpack/configs.js";
import n from "eslint-plugin-n";

export default defineConfig([
  {
    extends: [configs["recommended-dirty"]],
    plugins: {
      n,
    },
    rules: {
      // Disable experimental Node.js API warnings for os.availableParallelism
      // This API is widely supported and stable in practice
      "n/no-unsupported-features/node-builtins": [
        "error",
        {
          ignores: ["os.availableParallelism"],
        },
      ],
    },
  },
]);
