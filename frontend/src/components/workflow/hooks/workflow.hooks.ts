import { useCallback, useEffect, useState } from 'react';
import { useStore, useWorkflowStore } from '../store';

export const useWorkflowInit = () => {
  const workflowStore = useWorkflowStore();
  const { nodes: nodesTemplate, edges: edgesTemplate } = useWorkflowTemplate();
  const { handleFetchAllTools } = useFetchToolsData();
  const appDetail = useAppStore((state) => state.appDetail)!;
  const setSyncWorkflowDraftHash = useStore((s) => s.setSyncWorkflowDraftHash);
  const [data, setData] = useState<FetchWorkflowDraftResponse>();
  const [isLoading, setIsLoading] = useState(true);
  workflowStore.setState({ appId: appDetail.id });

  const handleGetInitialWorkflowData = useCallback(async () => {
    try {
      const res = await fetchWorkflowDraft(
        `/apps/${appDetail.id}/workflows/draft`
      );

      setData(res);
      setSyncWorkflowDraftHash(res.hash);
      setIsLoading(false);
    } catch (error: any) {
      if (error && error.json && !error.bodyUsed && appDetail) {
        error.json().then((err: any) => {
          if (err.code === 'draft_workflow_not_exist') {
            workflowStore.setState({ notInitialWorkflow: true });
            syncWorkflowDraft({
              url: `/apps/${appDetail.id}/workflows/draft`,
              params: {
                graph: {
                  nodes: nodesTemplate,
                  edges: edgesTemplate,
                },
                features: {},
              },
            }).then((res) => {
              workflowStore.getState().setDraftUpdatedAt(res.updated_at);
              handleGetInitialWorkflowData();
            });
          }
        });
      }
    }
  }, [
    appDetail,
    nodesTemplate,
    edgesTemplate,
    workflowStore,
    setSyncWorkflowDraftHash,
  ]);

  useEffect(() => {
    handleGetInitialWorkflowData();
  }, []);

  const handleFetchPreloadData = useCallback(async () => {
    try {
      const nodesDefaultConfigsData = await fetchNodesDefaultConfigs(
        `/apps/${appDetail?.id}/workflows/default-workflow-block-configs`
      );
      const publishedWorkflow = await fetchPublishedWorkflow(
        `/apps/${appDetail?.id}/workflows/publish`
      );
      workflowStore.setState({
        nodesDefaultConfigs: nodesDefaultConfigsData.reduce(
          (acc, block) => {
            if (!acc[block.type]) acc[block.type] = { ...block.config };
            return acc;
          },
          {} as Record<string, any>
        ),
      });
      workflowStore.getState().setPublishedAt(publishedWorkflow?.created_at);
    } catch (e) {}
  }, [workflowStore, appDetail]);

  useEffect(() => {
    handleFetchPreloadData();
    handleFetchAllTools('builtin');
    handleFetchAllTools('custom');
    handleFetchAllTools('workflow');
  }, [handleFetchPreloadData, handleFetchAllTools]);

  useEffect(() => {
    if (data) {
      workflowStore.getState().setDraftUpdatedAt(data.updated_at);
      workflowStore.getState().setToolPublished(data.tool_published);
    }
  }, [data, workflowStore]);

  return {
    data,
    isLoading,
  };
};
