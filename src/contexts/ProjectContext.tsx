import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { projectService, type Project } from "@/lib/services/projectService";
import { useAuth } from "@/contexts/AuthContext";

const PROJECT_STORAGE_KEY = "atlas_active_project_id";

interface ProjectContextValue {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project) => void;
  loading: boolean;
  error: string | null;
  refetchProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProjectState] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setActiveProjectState(null);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await projectService.getAll();
      setProjects(data);

      // Restore persisted active project or default to first
      const savedId = localStorage.getItem(PROJECT_STORAGE_KEY);
      const saved = savedId ? data.find((p) => p.id === savedId) : null;
      setActiveProjectState(saved ?? data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const setActiveProject = useCallback((project: Project) => {
    setActiveProjectState(project);
    localStorage.setItem(PROJECT_STORAGE_KEY, project.id);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projects,
        activeProject,
        setActiveProject,
        loading,
        error,
        refetchProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const ctx = useContext(ProjectContext);
  if (!ctx) throw new Error("useProject must be used within ProjectProvider");
  return ctx;
}
