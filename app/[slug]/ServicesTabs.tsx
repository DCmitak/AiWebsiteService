import type { Service } from "./types";
import ServicesTabsV1 from "./ServicesTabsV1";
import ServicesTabsV2 from "./ServicesTabsV2";

type Props = {
  services: Service[];
  primary: string;
  slug: string;
  variant?: "v1" | "v2" | string | null;
};

export default function ServicesTabs(props: Props) {
  const v = (props.variant || "v1").toString().toLowerCase();

  const { variant, ...rest } = props;

  if (v === "v2") return <ServicesTabsV2 {...rest} />;
  return <ServicesTabsV1 {...rest} />;
}
