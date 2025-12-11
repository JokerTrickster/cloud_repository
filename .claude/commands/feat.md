---
description: Created with Workflow Studio
allowed-tools: Task,AskUserQuestion
---
```mermaid
flowchart TD
    start_node_default([Start])
    doc_finder[doc-finder]
    doc_check{If/Else:<br/>Conditional Branch}
    doc_writer[doc-writer]
    requirements_analyzer[requirements-analyzer]
    frontend_dev[frontend-dev]
    doc_updater[doc-updater]
    build_test_agent[build-test-agent]
    error_check{If/Else:<br/>Conditional Branch}
    error_fixer[error-fixer]
    final_doc_update[final-doc-update]
    end_node_default([End])

    start_node_default --> doc_finder
    doc_finder --> doc_check
    doc_check -->|Documentation exists| requirements_analyzer
    doc_check -->|No documentation| doc_writer
    doc_writer --> requirements_analyzer
    requirements_analyzer --> frontend_dev
    frontend_dev --> doc_updater
    doc_updater --> build_test_agent
    build_test_agent --> error_check
    error_check -->|No errors| final_doc_update
    error_check -->|Has errors| error_fixer
    error_fixer --> build_test_agent
    final_doc_update --> end_node_default
```

## Workflow Execution Guide

Follow the Mermaid flowchart above to execute the workflow. Each node type has specific execution methods as described below.

### Execution Methods by Node Type

- **Rectangle nodes**: Execute Sub-Agents using the Task tool
- **Diamond nodes (AskUserQuestion:...)**: Use the AskUserQuestion tool to prompt the user and branch based on their response
- **Diamond nodes (Branch/Switch:...)**: Automatically branch based on the results of previous processing (see details section)
- **Rectangle nodes (Prompt nodes)**: Execute the prompts described in the details section below

### If/Else Node Details

#### doc_check(Binary Branch (True/False))

**Evaluation Target**: Documentation search result

**Branch conditions:**
- **Documentation exists**: Relevant documentation was found
- **No documentation**: No relevant documentation found

**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.

#### error_check(Binary Branch (True/False))

**Evaluation Target**: Build and test results

**Branch conditions:**
- **No errors**: Build successful, all tests passed, no console errors
- **Has errors**: Build failed, tests failed, or console errors detected

**Execution method**: Evaluate the results of the previous processing and automatically select the appropriate branch based on the conditions above.
