import { Image } from "expo-image";

// Original SVG paths and colors from z_prototipo/ordens-app.html.
const icons = {
  plus: require("../../../assets/images/ordens/plus.svg"),
  back: require("../../../assets/images/ordens/back.svg"),
  close: require("../../../assets/images/ordens/close.svg"),
  alertClose: require("../../../assets/images/ordens/alertClose.svg"),
  home: require("../../../assets/images/ordens/home.svg"),
  menu: require("../../../assets/images/ordens/menu.svg"),
  chevron: require("../../../assets/images/ordens/chevron.svg"),
  plusCircle: require("../../../assets/images/ordens/plusCircle.svg"),
  trash: require("../../../assets/images/ordens/trash.svg"),
  calendar: require("../../../assets/images/ordens/calendar.svg"),
  document: require("../../../assets/images/ordens/document.svg"),
} as const;

export function OrderIcon({ name, size }: { name: keyof typeof icons; size: number }) {
  return <Image source={icons[name]} style={{ width: size, height: size }} contentFit="contain" accessibilityElementsHidden />;
}
