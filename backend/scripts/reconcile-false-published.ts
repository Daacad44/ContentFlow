/**
 * scripts/reconcile-false-published.ts
 * Mark posts that were falsely stored as PUBLISHED (Zernio draft only) as FAILED.
 */
import { prisma } from '../src/config/prisma';
import { isLikelyZernioInternalId } from '../src/config/postPublishRules';

async function main() {
  const targets = await prisma.postTarget.findMany({
    where: { status: 'PUBLISHED' },
    include: { post: true },
  });

  let fixed = 0;
  for (const target of targets) {
    if (
      target.externalPostId &&
      isLikelyZernioInternalId(target.externalPostId) &&
      !target.platformPostUrl
    ) {
      await prisma.postTarget.update({
        where: { id: target.id },
        data: {
          status: 'FAILED',
          errorMessage:
            'Post was not confirmed on the platform. Please edit and use Publish now again.',
        },
      });
      await prisma.post.update({
        where: { id: target.postId },
        data: { status: 'FAILED', publishedAt: null },
      });
      fixed++;
      console.log('Fixed:', target.post.content.slice(0, 40));
    }
  }

  console.log(`Reconciled ${fixed} falsely published post(s).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
