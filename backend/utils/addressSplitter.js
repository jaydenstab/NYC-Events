/**
 * Smart Address Splitter
 * Splits a concatenated address string into a Venue Name and a Street Address.
 */
// Lookahead regex to find the start of a street address (e.g., "123 Main St")
const ADDRESS_REGEX = /(?=\d+\s+[A-Za-z\s]{1,100}(?:St|Ave|Rd|Blvd|Street|Avenue|Road)\b)/i;

function splitAddress(addr) {
    if (!addr) return ["", ""];
    const match = addr.match(ADDRESS_REGEX);
    if (!match) return [addr, ""];
    
    const splitIndex = match.index;
    let venue = addr.slice(0, splitIndex).trim();
    // Clean trailing commas or spaces
    if (venue.endsWith(",")) venue = venue.slice(0, -1).trim();
    
    return [venue, addr.slice(splitIndex).trim()];
}

module.exports = { splitAddress };
