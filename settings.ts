import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const settings: SettingSchemaDesc[] = [
  {
    key: "pageNameFormatKey",
    title: "Page name format",
    description: `For example: "🤡-{name}-{YYYY/MM/DD}" will generate "🤡-Page Name-2023/10/06".`,
    type: "string",
    default: "{name}",
  },
];
