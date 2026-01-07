import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "../use-auth";
import * as actions from "@/actions";
import * as anonWorkTracker from "@/lib/anon-work-tracker";
import * as getProjectsAction from "@/actions/get-projects";
import * as createProjectAction from "@/actions/create-project";
import { useRouter } from "next/navigation";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

// Mock actions
vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

// Mock anon work tracker
vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

// Mock get-projects
vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

// Mock create-project
vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

describe("useAuth", () => {
  const mockPush = vi.fn();
  const mockSignInAction = vi.mocked(actions.signIn);
  const mockSignUpAction = vi.mocked(actions.signUp);
  const mockGetAnonWorkData = vi.mocked(anonWorkTracker.getAnonWorkData);
  const mockClearAnonWork = vi.mocked(anonWorkTracker.clearAnonWork);
  const mockGetProjects = vi.mocked(getProjectsAction.getProjects);
  const mockCreateProject = vi.mocked(createProjectAction.createProject);

  beforeEach(() => {
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      refresh: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      prefetch: vi.fn(),
    } as any);

    // Reset all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("signIn", () => {
    it("should handle successful sign in with anonymous work", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "test message" }],
        fileSystemData: { "/": {} },
      };
      const mockProject = { id: "project-123", name: "Test Project" };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue(mockProject as any);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const response = await result.current.signIn("test@example.com", "password");

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "password");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-123");
      expect(response.success).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle successful sign in with existing projects", async () => {
      const mockProjects = [
        { id: "project-1", name: "Recent Project" },
        { id: "project-2", name: "Old Project" },
      ];

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(mockProjects as any);

      const { result } = renderHook(() => useAuth());

      const response = await result.current.signIn("test@example.com", "password");

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "password");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
      expect(response.success).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle successful sign in with no projects", async () => {
      const mockProject = { id: "new-project-123", name: "New Design #12345" };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(mockProject as any);

      const { result } = renderHook(() => useAuth());

      const response = await result.current.signIn("test@example.com", "password");

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "password");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/New Design #\d+/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-123");
      expect(response.success).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle failed sign in", async () => {
      mockSignInAction.mockResolvedValue({
        success: false,
        error: "Invalid credentials",
      });

      const { result } = renderHook(() => useAuth());

      const response = await result.current.signIn("test@example.com", "wrongpassword");

      expect(mockSignInAction).toHaveBeenCalledWith("test@example.com", "wrongpassword");
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(response.success).toBe(false);
      expect(response.error).toBe("Invalid credentials");
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle sign in with anonymous work but empty messages", async () => {
      const mockProjects = [{ id: "project-1", name: "Existing Project" }];

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue({ messages: [], fileSystemData: {} });
      mockGetProjects.mockResolvedValue(mockProjects as any);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-1");
    });

    it("should set loading state correctly during sign in", async () => {
      let resolveSignIn: (value: any) => void;
      const signInPromise = new Promise((resolve) => {
        resolveSignIn = resolve;
      });

      mockSignInAction.mockReturnValue(signInPromise as any);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "test-id" } as any);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const signInCall = result.current.signIn("test@example.com", "password");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      resolveSignIn!({ success: true });
      await signInCall;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should reset loading state even if sign in throws an error", async () => {
      mockSignInAction.mockRejectedValue(new Error("Network error"));

      const { result } = renderHook(() => useAuth());

      await expect(result.current.signIn("test@example.com", "password")).rejects.toThrow(
        "Network error"
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("signUp", () => {
    it("should handle successful sign up with anonymous work", async () => {
      const anonWork = {
        messages: [{ role: "user", content: "test message" }],
        fileSystemData: { "/": {}, "/App.tsx": {} },
      };
      const mockProject = { id: "project-456", name: "Test Project" };

      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue(mockProject as any);

      const { result } = renderHook(() => useAuth());

      const response = await result.current.signUp("newuser@example.com", "password");

      expect(mockSignUpAction).toHaveBeenCalledWith("newuser@example.com", "password");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringContaining("Design from"),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/project-456");
      expect(response.success).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle successful sign up with no existing work", async () => {
      const mockProject = { id: "new-project-789", name: "New Design #54321" };

      mockSignUpAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue(mockProject as any);

      const { result } = renderHook(() => useAuth());

      const response = await result.current.signUp("newuser@example.com", "password");

      expect(mockSignUpAction).toHaveBeenCalledWith("newuser@example.com", "password");
      expect(mockGetAnonWorkData).toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.stringMatching(/New Design #\d+/),
        messages: [],
        data: {},
      });
      expect(mockPush).toHaveBeenCalledWith("/new-project-789");
      expect(response.success).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it("should handle failed sign up", async () => {
      mockSignUpAction.mockResolvedValue({
        success: false,
        error: "Email already exists",
      });

      const { result } = renderHook(() => useAuth());

      const response = await result.current.signUp("existing@example.com", "password");

      expect(mockSignUpAction).toHaveBeenCalledWith("existing@example.com", "password");
      expect(mockGetAnonWorkData).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
      expect(response.success).toBe(false);
      expect(response.error).toBe("Email already exists");
      expect(result.current.isLoading).toBe(false);
    });

    it("should set loading state correctly during sign up", async () => {
      let resolveSignUp: (value: any) => void;
      const signUpPromise = new Promise((resolve) => {
        resolveSignUp = resolve;
      });

      mockSignUpAction.mockReturnValue(signUpPromise as any);
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "test-id" } as any);

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);

      const signUpCall = result.current.signUp("test@example.com", "password");

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      resolveSignUp!({ success: true });
      await signUpCall;

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it("should reset loading state even if sign up throws an error", async () => {
      mockSignUpAction.mockRejectedValue(new Error("Database error"));

      const { result } = renderHook(() => useAuth());

      await expect(result.current.signUp("test@example.com", "password")).rejects.toThrow(
        "Database error"
      );

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle null anonymous work data gracefully", async () => {
      const mockProjects = [{ id: "project-1", name: "Existing Project" }];

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue(mockProjects as any);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockClearAnonWork).not.toHaveBeenCalled();
      expect(mockGetProjects).toHaveBeenCalled();
    });

    it("should handle concurrent sign in calls", async () => {
      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(null);
      mockGetProjects.mockResolvedValue([]);
      mockCreateProject.mockResolvedValue({ id: "project-1" } as any);

      const { result } = renderHook(() => useAuth());

      const promise1 = result.current.signIn("user1@example.com", "password1");
      const promise2 = result.current.signIn("user2@example.com", "password2");

      await Promise.all([promise1, promise2]);

      expect(mockSignInAction).toHaveBeenCalledTimes(2);
      expect(result.current.isLoading).toBe(false);
    });

    it("should preserve anonymous work data through sign in flow", async () => {
      const anonWork = {
        messages: [
          { role: "user", content: "create a button" },
          { role: "assistant", content: "here's a button" },
        ],
        fileSystemData: {
          "/": {},
          "/Button.tsx": { content: "export const Button = () => {}" },
        },
      };
      const mockProject = { id: "preserved-project", name: "Preserved Work" };

      mockSignInAction.mockResolvedValue({ success: true });
      mockGetAnonWorkData.mockReturnValue(anonWork);
      mockCreateProject.mockResolvedValue(mockProject as any);

      const { result } = renderHook(() => useAuth());

      await result.current.signIn("test@example.com", "password");

      expect(mockCreateProject).toHaveBeenCalledWith({
        name: expect.any(String),
        messages: anonWork.messages,
        data: anonWork.fileSystemData,
      });
      expect(mockClearAnonWork).toHaveBeenCalled();
    });
  });

  describe("return value", () => {
    it("should return signIn, signUp, and isLoading", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current).toHaveProperty("signIn");
      expect(result.current).toHaveProperty("signUp");
      expect(result.current).toHaveProperty("isLoading");
      expect(typeof result.current.signIn).toBe("function");
      expect(typeof result.current.signUp).toBe("function");
      expect(typeof result.current.isLoading).toBe("boolean");
    });

    it("should initialize isLoading as false", () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
    });
  });
});
