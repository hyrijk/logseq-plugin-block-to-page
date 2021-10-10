import "@logseq/libs";
import { BlockEntity, BlockIdentity } from "@logseq/libs/dist/LSPlugin.user";
import { toBatchBlocks, mayBeReferenced } from "./util";

async function main(blockId: string) {
  const block = await logseq.Editor.getBlock(blockId, {
    includeChildren: true,
  });
  if (block === null || block.children?.length === 0) {
    return;
  }
  if (mayBeReferenced(block.children as BlockEntity[])) {
    // https://github.com/hyrijk/logseq-plugin-block-to-page/issues/1
    logseq.App.showMsg("some sub block may be referenced", "error");
    return;
  }

  const pageRegx = /^\[\[(.*)\]\]$/;
  const firstLine = block.content.split("\n")[0].trim();
  const pageName = firstLine.replace(pageRegx, "$1");

  let newBlockContent = "";
  if (!pageRegx.test(firstLine)) {
    newBlockContent = block.content.replace(firstLine, `[[${firstLine}]]`);
  }

  await createPageIfNotExist(pageName);

  const srcBlock = await getLastBlock(pageName);
  if (srcBlock) {
    // page.format 为空
    if (srcBlock.format !== block.format) {
      logseq.App.showMsg("page format not same", "error");
      return Promise.reject("page format not same");
    }

    await removeBlocks(block.children as BlockEntity[]);
    if (newBlockContent) {
      await logseq.Editor.updateBlock(block.uuid, newBlockContent);
      // propteties param not working...
      // and then remove block property will undo updateBlock...
    }
    await insertBatchBlock(srcBlock.uuid, block.children as BlockEntity[]);

    if (srcBlock.content === "") {
      // insertBatchBlock `before` param not working...
      await logseq.Editor.removeBlock(srcBlock.uuid);
    }

    await logseq.Editor.exitEditingMode();

    if (block.properties?.collapsed) {
      await logseq.Editor.removeBlockProperty(block.uuid, "collapsed");
    }
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
  const batchBlocks = toBatchBlocks(blocks);

  debug("insertBatchBlock", srcBlock, batchBlocks);
  await logseq.Editor.insertBatchBlock(srcBlock, batchBlocks, {
    sibling: true,
    before: false,
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
