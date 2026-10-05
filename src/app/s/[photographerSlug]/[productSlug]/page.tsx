import StoreProductClient from './StoreProductClient'

export const dynamic = 'force-dynamic'

export default async function StoreProductPage({
  params,
}: {
  params: Promise<{ photographerSlug: string; productSlug: string }>
}) {
  const { photographerSlug, productSlug } = await params
  return <StoreProductClient photographerSlug={photographerSlug} productSlug={productSlug} />
}
