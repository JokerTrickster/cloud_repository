---
description: Created with Workflow Studio
allowed-tools: Task,AskUserQuestion
---
```mermaid
flowchart TD
    start_node_default([Start])
    requirements_analyzer[requirements-analyzer]
    doc_finder[doc-finder]
    doc_exists_check{If/Else:<br/>Conditional Branch}
    analyze_docs[analyze-docs]
    analyze_code[analyze-code]
    implementation[implementation]
    build_test[build-test]
    update_docs[update-docs]
    end_node_default([End])

    start_node_default --> requirements_analyzer
    requirements_analyzer --> doc_finder
    doc_finder --> doc_exists_check
    doc_exists_check -->|Documentation exists| analyze_docs
    doc_exists_check -->|No documentation| analyze_code
    analyze_docs --> implementation
    analyze_code --> implementation
    implementation --> build_test
    build_test --> update_docs
    update_docs --> end_node_default
```

## Workflow Execution Guide

Follow the Mermaid flowchart above to execute the workflow. Each node type has specific execution methods as described below.

### Execution Methods by Node Type

- **Rectangle nodes**: Execute Sub-Agents using the Task tool
- **Diamond nodes (AskUserQuestion:...)**: Use the AskUserQuestion tool to prompt the user and branch based on their response
- **Diamond nodes (Branch/Switch:...)**: Automatically branch based on the results of previous processing (see details section)
- **Rectangle nodes (Prompt nodes)**: Execute the prompts described in the details section below

### If/Else Node Details

#### doc_exists_check(Binary Branch (True/False))

**Evaluation Target**: documentation existence

**Branch conditions:**
- **Documentation exists**: Relevant feature documentation found
- **No documentation**: No documentation found

**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.
