import { expect, test } from "@playwright/experimental-ct-vue";

import UserBalance from "../../../src/components/helper/UserBalance.vue";

test.use({ viewport: { width: 500,
  height: 500 } });

test(
  "UserBalance balance formatted display",
  async ({ mount }) => {
    const component = await mount(
      UserBalance,
      {
        props: { denom: "ugovgen" }
      }
    );

    await expect(component).toBeVisible();
    await expect(component).toContainText("8.998199");
  }
);
