"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import debounce from "debounce";
import getHeaders from "@/app/utils/headers.util";
import axios, { AxiosResponse } from "axios";
import Link from "next/link";
import {
  Edit,
  Play,
  Pause,
  Loader,
  Plus,
  Bot,
  AlertCircle,
  Trash,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { auth } from "@/configs/Firebase-config";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const AllAgents = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [statuses, setStatuses] = useState<{ [id: string]: string }>({});
  const userId = auth.currentUser?.uid || "";
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["all-agents"],
    queryFn: async () => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const response = await axios.get(
        `${baseUrl}/api/v1/list-available-agents/`,
        { params: { list_system_agents: false }, headers: headers }
      );
      return response.data;
    },
  });

  const fetchDeploymentStatus = async (agentId: string) => {
    try {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      const response = await axios.get(
        `${baseUrl}/deployment/agents/${agentId}/status`,
        { headers }
      );
      return response.data.status;
    } catch (error) {
      console.error(`Failed to fetch status for agent ${agentId}:`, error);
      toast.error(`Failed to fetch status for agent`);
      return "ERROR";
    }
  };

  useEffect(() => {
    if (data && data.length > 0) {
      const fetchStatuses = async () => {
        const newStatuses: { [id: string]: string } = {};
        await Promise.all(
          data.map(async (agent: { id: string }) => {
            const status = await fetchDeploymentStatus(agent.id);
            newStatuses[agent.id] = status;
          })
        );
        setStatuses(newStatuses);
      };
      fetchStatuses();
    }
  }, [data]);

  const deleteCustomAgentForm = useMutation({
    mutationFn: async (agentId: string) => {
      const header = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return (await axios.delete(`${baseUrl}/custom-agents/agents/${agentId}`, {
        headers: header,
      })) as AxiosResponse<CustomAgentType, any>;
    },
    onSuccess: () => {
      router.refresh();
      refetch();
      toast.success("Agent deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete agent");
    },
  });

  const deployAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return axios.post(
        `${baseUrl}/deployment/agents/${agentId}/deploy`,
        {},
        { headers }
      );
    },
    onSuccess: () => {
      toast.success("Agent deployed successfully");
      refetch();
    },
    onError: () => {
      toast.error("Failed to deploy agent");
    },
  });

  const stopAgent = useMutation({
    mutationFn: async (agentId: string) => {
      const headers = await getHeaders();
      const baseUrl = process.env.NEXT_PUBLIC_POTPIE_PLUS_URL;
      return axios.post(
        `${baseUrl}/deployment/agents/${agentId}/stop`,
        {},
        { headers }
      );
    },
    onSuccess: () => {
      toast.success("Agent stopped successfully");
      refetch();
    },
    onError: () => {
      toast.error("Failed to stop agent");
    },
  });

  useEffect(() => {
    const handler = debounce((value) => {
      setDebouncedSearchTerm(value);
    }, 500);
    handler(searchTerm);
    return () => {
      handler.clear();
    };
  }, [searchTerm]);

  const filteredData = data?.filter((agent: { name: string }) =>
    agent.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  return (
    <div className="m-10">
      <div className="flex w-full mx-auto items-center space-x-2 mb-5">
        <Input
          type="text"
          placeholder="Search your agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button className="gap-2" onClick={() => router.push("/agents")}>
          <Plus /> Create New Agent
        </Button>
      </div>
      <div className={`flex flex-wrap gap-16 items-center h-full w-full`}>
        {isLoading ? (
          Array.from({ length: 10 }).map((_, index) => (
            <Skeleton className="w-64 h-44" key={index} />
          ))
        ) : data && data.length === 0 && !searchTerm ? (
          <Card className="p-6 w-full text-center shadow-md rounded-2xl">
            <CardContent>
              <p className="text-lg text-muted">No agents available.</p>
              <Button className="mt-4" onClick={() => router.push("/agents")}>
                <Plus /> Create New Agent
              </Button>
            </CardContent>
          </Card>
        ) : filteredData && filteredData.length === 0 && searchTerm ? (
          <div className="flex flex-col items-center justify-center w-full py-10">
            <p className="text-lg text-muted-foreground">
              No agents found matching {debouncedSearchTerm}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchTerm("")}
            >
              Clear Search
            </Button>
          </div>
        ) : (
          filteredData.map(
            (
              content: { id: string; name: string; description: string },
              index: React.Key
            ) => {
              const deploymentStatus = statuses[content.id];
              return (
                <Card
                  key={index}
                  className={`pt-2 border-border w-[485px] shadow-sm rounded-2xl cursor-pointer hover:scale-105 transition-all duration-300 hover:border-[#FFB36E] hover:border-2 hover:shadow-md`}
                >
                  <CardHeader className="p-1 px-6 font-normal flex flex-row justify-between items-center">
                    <CardTitle className="text-lg text-muted flex gap-2 items-center max-w-[380px]">
                      <div className="truncate">{content.name}</div>
                      <Bot className="flex-shrink-0" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-base text-muted-foreground leading-tight px-6 mt-4 pb-4 flex flex-row justify-between h-full relative">
                    <p className="line-clamp-3 overflow-hidden flex-grow max-w-[380px]">
                      {content.description}
                    </p>
                  </CardContent>
                  <CardFooter className="items-center flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-primary"
                      onClick={() =>
                        deploymentStatus === "DEPLOYED"
                          ? stopAgent.mutate(content.id)
                          : deployAgent.mutate(content.id)
                      }
                    >
                      {deploymentStatus === "ERRORED" ? (
                        <AlertCircle className="size-5 text-red-600" />
                      ) : !deploymentStatus ? (
                        <Loader className="size-5 animate-spin" />
                      ) : deploymentStatus === "RUNNING" ? (
                        <Pause className="size-5" />
                      ) : deploymentStatus === "IN_PROGRESS" ? (
                        <Loader className="size-5 animate-spin" />
                      ) : deploymentStatus === "STOPPED" ? (
                        <Play className="size-5" />
                      ) : (
                        <AlertCircle className="size-5 text-red-600" />
                      )}
                    </Button>{" "}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-primary"
                      onClick={() => deleteCustomAgentForm.mutate(content.id)}
                    >
                      <Trash className="size-5" />
                    </Button>
                    <Link href={`/agents?edit=${content.id}`}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-primary"
                      >
                        <Edit className="w-5 h-5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              );
            }
          )
        )}
      </div>
    </div>
  );
};

export default AllAgents;
