import { SEMANTIC_TYPE_NAMES } from './registry.js';

import type { SemanticTypeName } from '../types.js';

export { getRegistryEntry, SEMANTIC_TYPE_NAMES } from './registry.js';

export const listSemanticTypes = (): readonly SemanticTypeName[] => SEMANTIC_TYPE_NAMES;
