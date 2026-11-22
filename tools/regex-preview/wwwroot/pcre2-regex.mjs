const runtime = new URL('./_pcre2/10.49.3/lib/index.js', import.meta.url);

// PCRE2_ERROR_MATCHLIMIT, PCRE2_ERROR_DEPTHLIMIT, and PCRE2_ERROR_HEAPLIMIT.
const limitErrors = new Set([-47, -53, -63]);

export async function startPcre2Regex() {
  const { createPCRE2, FLAGS, PCRE2CompileError, PCRE2MatchError } = await import(runtime);
  const pcre2 = await createPCRE2();

  return {
    match(pattern, input) {
      try {
        const result = pcre2.match(pattern, input, FLAGS.UTF);
        return result
          ? { status: 'match', text: result.match, index: result.index, groups: result.groups }
          : { status: 'no-match' };
      } catch (error) {
        if (error instanceof PCRE2CompileError) return { status: 'invalid', message: error.message };
        if (error instanceof PCRE2MatchError && limitErrors.has(error.code)) return { status: 'limit' };
        throw error;
      }
    },
    validate(pattern) {
      try {
        pcre2.compile(pattern, FLAGS.UTF).destroy();
        return null;
      } catch (error) {
        if (error instanceof PCRE2CompileError) return error.message;
        throw error;
      }
    },
  };
}
