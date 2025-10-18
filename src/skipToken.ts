/**
 * A unique symbol used to indicate that reading the flow should be skipped.
 *
 * When passed as an argument to flow hooks, it signals that the flow
 * should not be read and no result will be returned.
 *
 * @example
 * ```tsx
 * const result = useFlow(shouldSkip ? skipToken : flow);
 * ```
 */
export const skipToken = Symbol("skipToken");

/**
 * Type representing the {@link skipToken} symbol.
 */
export type SkipToken = typeof skipToken;
