import "@logseq/libs";
import {
  BlockEntity,
  BlockIdentity,
  IBatchBlock,
} from "@logseq/libs/dist/LSPlugin.user";

async function main(blockId: string) {
  const block = await logseq.Editor.getBlock(blockId, {
    includeChildren: true,
  });
  if (block === null) {
    return;
  }

  const pageRegx = /^\[\[(.*)\]\]$/;
  const pageName = block.content.replace(pageRegx, "$1");
  await createPageIfNotExist(pageName);

  const srcBlock = await getLastBlock(pageName);
  if (srcBlock) {
    // page.format 为空
    if (srcBlock.format !== block.format) {
      logseq.App.showMsg("page format not same", "warning");
      return Promise.reject("page format not same");
    }

    await removeBlocks(block.children as BlockEntity[]);
    if (!pageRegx.test(block.content)) {
      await logseq.Editor.updateBlock(block.uuid, `[[${block.content}]]`);
    }
    await insertBatchBlock(srcBlock.uuid, block.children as BlockEntity[]);

    if (srcBlock.content === "") {
      // insertBatchBlock before 参数无效
      await logseq.Editor.removeBlock(srcBlock.uuid);
    }

    await logseq.Editor.exitEditingMode();
  }
}

logseq
  .ready(() => {
    logseq.Editor.registerSlashCommand("Turn Into Page", async (e) => {
      main(e.uuid);
    });
    logseq.Editor.registerBlockContextMenuItem("Turn into page", async (e) => {
      main(e.uuid);
    });
  })
  .catch(console.error);

async function insertBatchBlock(
  srcBlock: BlockIdentity,
  blocks: BlockEntity[]
) {
  // children: [] 会出错
  const batchBlocks = blocks.map((c) => ({
    content: c.content,
    children: c.children?.length ? (c.children as IBatchBlock[]) : undefined,
  }));

  debug("insertBatchBlock", srcBlock, batchBlocks);
  await logseq.Editor.insertBatchBlock(srcBlock, batchBlocks, {
    sibling: true,
  });
}

async function createPageIfNotExist(pageName: string) {
  let page = await logseq.Editor.getPage(pageName);
  if (!page) {
    await logseq.Editor.createPage(
      pageName,
      {},
      {
        createFirstBlock: true,
        redirect: false,
      }
    );
  } else {
    debug("page already exist");
    const lastBlock = await getLastBlock(pageName);
    if (lastBlock === null) {
      // 无法往空页面写入 block
      await logseq.Editor.deletePage(pageName);
      await logseq.Editor.createPage(
        pageName,
        {},
        {
          createFirstBlock: true,
          redirect: false,
        }
      );
    }
  }
}

async function removeBlocks(blocks: BlockEntity[]) {
  for (let i = 0; i < blocks.length; i++) {
    const child = blocks[i];
    await logseq.Editor.removeBlock(child.uuid);
  }
}

async function getLastBlock(pageName: string): Promise<null | BlockEntity> {
  const blocks = await logseq.Editor.getPageBlocksTree(pageName);
  if (blocks.length === 0) {
    return null;
  }
  return blocks[blocks.length - 1];
}

function debug(...args: any) {
  console.debug("block-to-page", ...args);
}
