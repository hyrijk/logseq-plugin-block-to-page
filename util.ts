import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user";

function hasProperties(block: BlockEntity) {
  const properties = block.meta?.properties || {};
  return Object.keys(properties).length > 0;
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
