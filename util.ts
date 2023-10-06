import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";
import dayjs from "dayjs";

function hasProperty(block: BlockEntity, propertyKey: string): boolean {
  return block.properties?.[propertyKey] !== undefined;
}

export function toBatchBlocks(blocks: BlockEntity[]) {
  return blocks.map((c) => ({
    content: c.content,
    // children: [] 会出错
    children: c.children?.length
      ? toBatchBlocks(c.children as BlockEntity[])
      : undefined,
    properties: c.properties,
  }));
}

export function mayBeReferenced(blocks: BlockEntity[]) {
  return blocks.some((b) => {
    if (hasProperty(b, "id")) {
      return true;
    } else {
      if (b.children) {
        return mayBeReferenced(b.children as BlockEntity[]);
      } else {
        return false;
      }
    }
  });
}

export const formatPageName = (pageName: string) => {
  const format = logseq.settings?.["pageNameFormatKey"];
  if (!format) {
    return pageName;
  }
  let name = logseq.settings?.["pageNameFormatKey"].replaceAll(
    /{name}/g,
    pageName
  );
  while (/\{[^{}]+\}/.test(name)) {
    name = name.replace(/(\{[^{}]+\})/, ($1) =>
      dayjs().format($1.slice(1, -1))
    );
  }
  return name;
};
