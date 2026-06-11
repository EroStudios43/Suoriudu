const emptyOrRows = (result) => {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    return result.rows || [];
}

export { emptyOrRows }
