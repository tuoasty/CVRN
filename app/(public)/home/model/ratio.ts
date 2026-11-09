export function postRatio(post: { image_width: number | null; image_height: number | null }): number {
    if (!post.image_width || !post.image_height) return 16 / 9;
    return post.image_width / post.image_height;
}
