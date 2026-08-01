import { View } from "react-native";
import { render } from "nativewind/test";

import { Text } from "@/components/native-ui";
import { themeColors, themeColorsTailwind } from "@/libs/colors";
import tailwindConfig from "../../tailwind.config";

const { content: _content, ...config } = tailwindConfig;

const renderText = (className: string, theme: "light" | "dark") =>
  render(
    <View style={themeColorsTailwind[theme]}>
      <Text className={className}>Value</Text>
    </View>,
    { config }
  );

const textStyleOf = (tree: any) => {
  const stack = [tree].flat();
  while (stack.length) {
    const node = stack.shift();
    if (!node || typeof node !== "object") continue;
    if (node.props?.textStyle) return node.props.textStyle;
    if (node.children) stack.push(...node.children);
  }
  return undefined;
};

describe("@expo/ui components with NativeWind", () => {
  it("resolves a theme colour into the textStyle prop @expo/ui translates", async () => {
    const { toJSON } = await renderText("text-text-muted", "light");

    expect(textStyleOf(toJSON())).toMatchObject({ color: themeColors.light.textMuted });
  });

  it("follows the active theme's variables", async () => {
    const { toJSON } = await renderText("text-text-muted", "dark");

    expect(textStyleOf(toJSON())).toMatchObject({ color: themeColors.dark.textMuted });
  });

  it("resolves colour and type scale together", async () => {
    const { toJSON } = await renderText("text-destructive text-sm", "light");

    // 12.25 rather than 14: NativeWind's rem is 14px on native, so the native tree and the
    // React Native tree size text identically for the same class.
    expect(textStyleOf(toJSON())).toMatchObject({
      color: themeColors.light.destructive,
      fontSize: 12.25,
    });
  });
});
