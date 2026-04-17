import { jest } from "@jest/globals";
import { QueryFailedError } from "typeorm";
import { ZodError } from "zod";
import { AppError } from "../../src/errors/AppError.js";
import { errorMiddleware } from "../../src/middleware/errorMiddleware.js";

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

describe("errorMiddleware", () => {
  const req = {} as any;
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("retorna status e mensagem de AppError", () => {
    const res = createResponse();

    errorMiddleware(new AppError("Falha de negócio", 422), req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ message: "Falha de negócio" });
  });

  test("retorna 400 para ZodError", () => {
    const res = createResponse();
    const error = new ZodError([
      {
        code: "custom",
        path: ["campo"],
        message: "inválido",
      },
    ]);

    errorMiddleware(error, req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Dados inválidos" })
    );
  });

  test("retorna 409 para conflito de unicidade no banco", () => {
    const res = createResponse();
    const error = new QueryFailedError("INSERT INTO ordem_servico ...", [], {
      code: "23505",
    } as any);

    errorMiddleware(error, req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Não foi possível concluir a operação por conflito de dados.",
    });
  });

  test("retorna 500 padronizado para erro genérico de banco", () => {
    const res = createResponse();
    const error = new QueryFailedError("INSERT INTO ordem_servico ...", [], {
      code: "99999",
    } as any);

    errorMiddleware(error, req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Não foi possível concluir a operação no momento.",
    });
  });

  test("retorna 500 padronizado para erro inesperado", () => {
    const res = createResponse();

    errorMiddleware(new Error("mensagem interna"), req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Erro interno do servidor",
    });
  });
});
