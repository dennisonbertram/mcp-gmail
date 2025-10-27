// Type declarations for mcp-framework to fix strictness issues
// We suppress the mcp-framework type error as it's an issue with the framework itself
// not our code. The BaseTransport interface has onclose as optional but Transport
// requires it to be required, which is a framework issue.
