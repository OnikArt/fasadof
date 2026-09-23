import { createEmployee, listEmployees, updateEmployee, type EmployeeRole } from "@/server/employees";
import { getManagerFromCookieHeader } from "@/server/manager-auth";
import { notifyAdminActionInMax } from "@/server/notifications";

async function requireAdmin(request: Request) {
  const manager = await getManagerFromCookieHeader(request.headers.get("cookie"));
  if (!manager) return null;
  return manager.role === "ADMIN" || manager.role === "admin" ? manager : null;
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  return Response.json({ employees: await listEmployees() });
}

export async function POST(request: Request) {
  return upsertEmployee(request);
}

export async function PATCH(request: Request) {
  return upsertEmployee(request);
}

export async function DELETE(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return Response.json({ error: "employee id is required" }, { status: 400 });
  if (id === admin.id || (id === "env-admin" && admin.id === "env-admin")) {
    return Response.json({ error: "Нельзя отключить свою учётную запись" }, { status: 409 });
  }

  const employee = await updateEmployee(id, { isActive: false });
  if (!employee) return Response.json({ error: "employee not found" }, { status: 404 });

  await notifyAdminActionInMax({ title: "Сотрудник отключён", subject: employee.name, employee: admin.name });
  return Response.json({ employee, employees: await listEmployees() });
}

async function upsertEmployee(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  const payload = (await request.json()) as {
    id?: string;
    name?: string;
    email?: string;
    password?: string;
    role?: EmployeeRole;
    isActive?: boolean;
  };

  if (payload.id) {
    if (payload.id === admin.id && payload.isActive === false) {
      return Response.json({ error: "Нельзя отключить свою учётную запись" }, { status: 409 });
    }
    const employee = await updateEmployee(payload.id, {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      isActive: payload.isActive,
      password: payload.password,
    });
    if (!employee) return Response.json({ error: "employee not found" }, { status: 404 });
    await notifyAdminActionInMax({ title: "Учётная запись сотрудника изменена", subject: employee.name, employee: admin.name });
    return Response.json({ employee, employees: await listEmployees() });
  }

  if (!payload.name?.trim() || !payload.email?.trim() || !payload.password?.trim()) {
    return Response.json({ error: "name, email and password are required" }, { status: 400 });
  }

  if (payload.password.length < 12) {
    return Response.json({ error: "password must contain at least 12 characters" }, { status: 400 });
  }

  try {
    const employee = await createEmployee({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      role: payload.role === "ADMIN" ? "ADMIN" : "MANAGER",
    });
    await notifyAdminActionInMax({ title: "Сотрудник добавлен", subject: employee.name, employee: admin.name });
    return Response.json({ employee, employees: await listEmployees() }, { status: 201 });
  } catch {
    return Response.json({ error: "employee email already exists" }, { status: 409 });
  }
}
