/**
 * Helper utility for safe SQLite query parameter handling
 * Prevents "Too many parameter values" errors by validating and sanitizing parameters
 */

/**
 * Sanitizes an array of SQL parameters by removing undefined values
 * and ensuring parameters match placeholders
 */
export function sanitizeParams(params: any[]): any[] {
  return params.filter(param => param !== undefined);
}

/**
 * Validates that the number of parameters matches the number of placeholders in a query
 * @param query SQL query string with ? placeholders
 * @param params Array of parameters to pass to the query
 * @returns true if valid, throws error if not
 */
export function validateParamCount(query: string, params: any[]): boolean {
  const placeholders = (query.match(/\?/g) || []).length;
  const paramCount = params.length;

  if (placeholders !== paramCount) {
    throw new Error(
      `Parameter count mismatch: Query has ${placeholders} placeholders but ${paramCount} parameters provided. ` +
      `Query: ${query.substring(0, 200)}...`
    );
  }

  return true;
}

/**
 * Safely prepares and validates a query before execution
 * @param db Database instance
 * @param query SQL query string
 * @param params Array of parameters (may contain undefined values)
 * @returns Prepared statement with sanitized parameters
 */
export function prepareQuery(
  db: any,
  query: string,
  params: any[] = []
): { statement: any; params: any[] } {
  const sanitizedParams = sanitizeParams(params);
  
  // Count placeholders in the query
  const placeholders = (query.match(/\?/g) || []).length;
  
  // If placeholders don't match, we need to adjust
  // This can happen if undefined values were filtered out
  if (sanitizedParams.length !== placeholders) {
    // Rebuild params array, replacing undefined with null
    const rebuiltParams: any[] = [];
    let paramIndex = 0;
    
    for (let i = 0; i < params.length; i++) {
      if (params[i] !== undefined) {
        rebuiltParams.push(params[i]);
        paramIndex++;
      } else {
        // If we have more placeholders than params after this undefined,
        // we need to insert null
        if (paramIndex < placeholders) {
          rebuiltParams.push(null);
          paramIndex++;
        }
      }
    }
    
    // If still don't match, something is wrong
    if (rebuiltParams.length !== placeholders) {
      throw new Error(
        `Cannot align parameters with placeholders: Query has ${placeholders} placeholders ` +
        `but only ${rebuiltParams.length} valid parameters. Original params: ${params.length}. ` +
        `Query: ${query.substring(0, 200)}...`
      );
    }
    
    return {
      statement: db.prepare(query),
      params: rebuiltParams
    };
  }

  return {
    statement: db.prepare(query),
    params: sanitizedParams
  };
}

/**
 * Safely executes a SELECT query with validation
 */
export function safeQuery(
  db: any,
  query: string,
  params: any[] = [],
  method: 'get' | 'all' = 'all'
): any {
  const { statement, params: finalParams } = prepareQuery(db, query, params);
  
  if (method === 'get') {
    return statement.get(...finalParams);
  } else {
    return statement.all(...finalParams);
  }
}

/**
 * Safely executes a mutation query (INSERT/UPDATE/DELETE) with validation
 */
export function safeRun(
  db: any,
  query: string,
  params: any[] = []
): any {
  const { statement, params: finalParams } = prepareQuery(db, query, params);
  return statement.run(...finalParams);
}

/**
 * Helper for building IN clause queries safely
 * @param values Array of values for IN clause
 * @returns Object with placeholders string and parameter array
 */
export function buildInClause(values: any[]): { placeholders: string; params: any[] } {
  if (!values || values.length === 0) {
    return { placeholders: 'NULL', params: [] };
  }
  
  const sanitized = values.filter(v => v !== undefined && v !== null);
  if (sanitized.length === 0) {
    return { placeholders: 'NULL', params: [] };
  }
  
  return {
    placeholders: sanitized.map(() => '?').join(','),
    params: sanitized
  };
}

