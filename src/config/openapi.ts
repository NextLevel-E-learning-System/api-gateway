export function loadOpenApi(title='API Gateway'){ 
  return { 
    openapi:'3.0.3', 
    info:{ 
      title, 
      version:'1.0.0',
      description: 'Gateway para todos os microserviços do NextLevel E-learning System'
    }, 
    paths:{ 
      // Auth Service Routes - /auth/v1
      '/auth/v1/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Fazer login',
          description: 'Autentica um usuário no sistema',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email', description: 'Email do usuário' },
                    senha: { type: 'string', minLength: 6, description: 'Senha do usuário' }
                  },
                  required: ['email', 'senha']
                }
              }
            }
          },
          responses: {
            '200': { 
              description: 'Login realizado com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      accessToken: { type: 'string' },
                      tokenType: { type: 'string' },
                      expiresInHours: { type: 'number' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Credenciais inválidas' }
          }
        }
      },
      '/auth/v1/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Registrar usuário',
          description: 'Registra um novo funcionário no sistema',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nome: { type: 'string', minLength: 1, description: 'Nome completo do funcionário' },
                    cpf: { type: 'string', pattern: '^\\d{11}$', description: 'CPF com 11 dígitos' },
                    email: { type: 'string', format: 'email', description: 'Email corporativo' },
                    departamento_id: { type: 'string', minLength: 1, description: 'ID do departamento' },
                    cargo: { type: 'string', minLength: 1, description: 'Cargo do funcionário' }
                  },
                  required: ['nome', 'cpf', 'email', 'departamento_id', 'cargo']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Usuário registrado com sucesso' },
            '400': { description: 'Dados inválidos' }
          }
        }
      },
      '/auth/v1/logout': {
        post: {
          tags: ['Authentication'],
          summary: 'Fazer logout',
          description: 'Encerra a sessão do usuário',
          responses: {
            '200': { description: 'Logout realizado com sucesso' }
          }
        }
      },
      '/auth/v1/reset-password': {
        post: {
          tags: ['Authentication'],
          summary: 'Reset de senha',
          description: 'Gera nova senha enviando email (identificação por email ou userId). Invalida tokens ativos.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Informe email OU userId',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    userId: { type: 'string', format: 'uuid' }
                  },
                  minProperties: 1
                }
              }
            }
          },
          responses: {
            '200': { description: 'Senha redefinida (email enviado se existir)' },
            '404': { description: 'Usuário não encontrado' },
            '400': { description: 'Parâmetros ausentes' }
          }
        }
      },
      '/auth/v1/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'Renovar token',
          description: 'Renova o token de acesso usando o refresh token',
          responses: {
            '200': { description: 'Token renovado com sucesso' },
            '401': { description: 'Refresh token inválido' }
          }
        }
      },
      // User Service Routes - /users/v1
      '/users/v1/departments': {
        get: {
          tags: ['Users'],
          summary: 'Listar departamentos',
          description: 'Retorna a lista de departamentos disponíveis',
          responses: {
            '200': { description: 'Lista de departamentos' }
          }
        }
      },
      '/users/v1/me': {
        get: {
          tags: ['Users'],
          summary: 'Obter perfil do usuário',
          description: 'Retorna o perfil do usuário autenticado',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Perfil do usuário' },
            '401': { description: 'Não autorizado' }
          }
        }
      },
      '/users/v1': {
        post: {
          tags: ['Users'],
          summary: 'Completar cadastro',
          description: 'Completa o cadastro do usuário com informações adicionais',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nome: { type: 'string', minLength: 1, description: 'Nome completo' },
                    cpf: { type: 'string', pattern: '^\\d{11}$', description: 'CPF com 11 dígitos' },
                    email: { type: 'string', format: 'email', description: 'Email (apenas INSTRUTOR pode alterar)' },
                    departamento_id: { type: 'string', minLength: 1, description: 'ID do departamento' },
                    cargo: { type: 'string', minLength: 1, description: 'Cargo do funcionário' }
                  },
                  required: ['nome', 'cpf', 'departamento_id', 'cargo']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Cadastro completado com sucesso' },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Sem permissão para alterar email' }
          }
        }
      },
      '/users/v1/{id}': {
        get: {
          tags: ['Users'],
          summary: 'Obter usuário por ID',
          description: 'Retorna informações de um usuário específico',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': { description: 'Dados do usuário' },
            '404': { description: 'Usuário não encontrado' }
          }
        }
      },
      // Course Service Routes - /courses/v1
      '/courses/v1': {
        post: {
          tags: ['Courses'],
          summary: 'Criar curso',
          description: 'Cria um novo curso',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    codigo: { type: 'string', description: 'Código único do curso' },
                    titulo: { type: 'string', description: 'Título do curso' },
                    descricao: { type: 'string', description: 'Descrição do curso' },
                    categoria_id: { type: 'string', description: 'ID da categoria' },
                    instrutor_id: { type: 'string', format: 'uuid', description: 'ID do instrutor' },
                    duracao_estimada: { type: 'integer', minimum: 1, description: 'Duração estimada em horas' },
                    xp_oferecido: { type: 'integer', minimum: 1, description: 'XP oferecido ao completar' },
                    nivel_dificuldade: { type: 'string', description: 'Nível de dificuldade' },
                    pre_requisitos: { type: 'array', items: { type: 'string' }, description: 'Lista de pré-requisitos' }
                  },
                  required: ['codigo', 'titulo']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Curso criado com sucesso' },
            '401': { description: 'Não autorizado' }
          }
        }
      },
      '/courses/v1/{codigo}': {
        get: {
          tags: ['Courses'],
          summary: 'Obter curso',
          description: 'Retorna detalhes de um curso específico pelo código',
          parameters: [
            {
              name: 'codigo',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Código único do curso'
            }
          ],
          responses: {
            '200': { description: 'Detalhes do curso' },
            '404': { description: 'Curso não encontrado' }
          }
        }
      },
      '/courses/v1/{codigo}/duplicar': {
        post: {
          tags: ['Courses'],
          summary: 'Duplicar curso',
          description: 'Cria uma cópia do curso (módulos ainda não clonados).',
          parameters: [
            { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '201': { description: 'Duplicado' },
            '404': { description: 'Curso não encontrado' }
          }
        }
      },
      '/courses/v1/{codigo}/ativar': {
        post: {
          tags: ['Courses'],
          summary: 'Ativar curso',
          parameters: [
            { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Ativado' },
            '404': { description: 'Curso não encontrado' }
          }
        }
      },
      '/courses/v1/{codigo}/desativar': {
        post: {
          tags: ['Courses'],
          summary: 'Desativar curso',
          parameters: [
            { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Desativado' },
            '404': { description: 'Curso não encontrado' }
          }
        }
      },
      '/courses/v1/{codigo}/modulos': {
        get: {
          tags: ['Courses'],
          summary: 'Listar módulos',
          parameters: [
            { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Lista de módulos' },
            '404': { description: 'Curso não encontrado' }
          }
        },
        post: {
          tags: ['Courses'],
          summary: 'Adicionar módulo',
          parameters: [
            { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    titulo: { type: 'string' },
                    descricao: { type: 'string' },
                    ordem: { type: 'integer' },
                    xp: { type: 'integer' }
                  },
                  required: ['titulo']
                }
              }
            },
            responses: {
              '201': { description: 'Criado' },
              '404': { description: 'Curso não encontrado' }
            }
          }
        }
      },
      '/courses/v1/{codigo}/inscrever': {
        post: {
          tags: ['Courses'],
          summary: 'Inscrever usuário',
          parameters: [
            { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' }
                  },
                  required: ['userId']
                }
              }
            },
            responses: {
              '201': { description: 'Inscrito' },
              '409': { description: 'Já inscrito' },
              '404': { description: 'Curso não encontrado' }
            }
          }
        }
      },
      '/courses/v1/catalogo': {
        get: {
          tags: ['Courses'],
          summary: 'Catálogo',
          parameters: [
            { name: 'categoria', in: 'query', schema: { type: 'string' } },
            { name: 'instrutor', in: 'query', schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Lista de cursos' }
          }
        }
      },
      '/courses/v1/dashboard/instrutor': {
        get: {
          tags: ['Courses'],
          summary: 'Dashboard instrutor',
          responses: {
            '200': { description: 'OK' }
          }
        }
      },
      '/courses/v1/dashboard/funcionario': {
        get: {
          tags: ['Courses'],
          summary: 'Dashboard funcionário',
          responses: {
            '200': { description: 'OK' }
          }
        }
      },
      // Assessment Service Routes - /assessments/v1
      '/assessments/v1': {
        post: {
          tags: ['Assessments'],
          summary: 'Criar avaliação',
          description: 'Cria uma nova avaliação',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    codigo: { type: 'string', description: 'Código único da avaliação' },
                    curso_id: { type: 'string', description: 'ID do curso' },
                    titulo: { type: 'string', description: 'Título da avaliação' },
                    tempo_limite: { type: 'integer', minimum: 1, description: 'Tempo limite em minutos' },
                    tentativas_permitidas: { type: 'integer', minimum: 1, description: 'Número de tentativas permitidas' },
                    nota_minima: { type: 'number', minimum: 0, description: 'Nota mínima para aprovação' }
                  },
                  required: ['codigo', 'curso_id', 'titulo']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Avaliação criada com sucesso' },
            '401': { description: 'Não autorizado' }
          }
        }
      },
      '/assessments/v1/{codigo}': {
        get: {
          tags: ['Assessments'],
          summary: 'Obter avaliação',
          description: 'Retorna detalhes de uma avaliação específica pelo código',
          parameters: [
            {
              name: 'codigo',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Código único da avaliação'
            }
          ],
          responses: {
            '200': { description: 'Detalhes da avaliação' },
            '404': { description: 'Avaliação não encontrada' }
          }
        }
      },
      // Progress Service Routes - /progress/v1
      '/progress/v1/inscricoes': {
        post: {
          tags: ['Progress'],
          summary: 'Criar inscrição',
          description: 'Inscreve um usuário em um curso',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid', description: 'ID único da inscrição' },
                    funcionario_id: { type: 'string', format: 'uuid', description: 'ID do funcionário' },
                    curso_id: { type: 'string', description: 'ID do curso' }
                  },
                  required: ['id', 'funcionario_id', 'curso_id']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Inscrição criada com sucesso' },
            '401': { description: 'Não autorizado' }
          }
        }
      },
      '/progress/v1/inscricoes/{id}': {
        get: {
          tags: ['Progress'],
          summary: 'Obter inscrição',
          description: 'Retorna detalhes de uma inscrição específica',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            '200': { description: 'Detalhes da inscrição' },
            '401': { description: 'Não autorizado' },
            '404': { description: 'Inscrição não encontrada' }
          }
        }
      },
      '/progress/v1/inscricoes/{id}/progresso': {
        patch: {
          tags: ['Progress'],
          summary: 'Atualizar progresso',
          description: 'Atualiza o progresso de uma inscrição',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    progresso_percentual: { type: 'integer', minimum: 0, maximum: 100, description: 'Progresso em percentual (0-100)' }
                  },
                  required: ['progresso_percentual']
                }
              }
            }
          },
          responses: {
            '200': { description: 'Progresso atualizado com sucesso' },
            '401': { description: 'Não autorizado' }
          }
        }
      },
      '/progress/v1/inscricoes/{id}/modulos/{moduloId}/concluir': {
        post: {
          tags: ['Progress'],
          summary: 'Concluir módulo',
          description: 'Marca módulo como concluído e recalcula progresso (emite eventos).',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'moduloId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '201': { description: 'Módulo concluído' },
            '404': { description: 'Inscrição ou módulo não encontrado' }
          }
        }
      },
      // Gamification Service Routes - /gamification/v1
      '/gamification/v1/badges': {
        post: {
          tags: ['Gamification'],
          summary: 'Criar badge',
          description: 'Cria um novo badge',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    codigo: { type: 'string', description: 'Código único do badge' },
                    nome: { type: 'string', description: 'Nome do badge' },
                    descricao: { type: 'string', description: 'Descrição do badge' },
                    criterio: { type: 'string', description: 'Critério para obter o badge' },
                    icone_url: { type: 'string', format: 'uri', description: 'URL do ícone do badge' },
                    pontos_necessarios: { type: 'integer', minimum: 1, description: 'Pontos necessários para obter o badge' }
                  },
                  required: ['codigo', 'nome', 'pontos_necessarios']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Badge criado com sucesso' },
            '401': { description: 'Não autorizado' }
          }
        }
      },
      '/gamification/v1/badges/{codigo}': {
        get: {
          tags: ['Gamification'],
          summary: 'Obter badge',
          description: 'Retorna detalhes de um badge específico',
          parameters: [
            {
              name: 'codigo',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Código único do badge'
            }
          ],
          responses: {
            '200': { description: 'Detalhes do badge' },
            '404': { description: 'Badge não encontrado' }
          }
        }
      },
      '/gamification/v1/me': {
        get: {
          tags: ['Gamification'],
          summary: 'Perfil gamification',
          description: 'Retorna XP, nível e badges do usuário (usa cabeçalho X-User-Id enquanto autenticação real não é integrada).',
          parameters: [
            { name: 'X-User-Id', in: 'header', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Perfil retornado' }
          }
        }
      },
      '/gamification/v1/conquistas': {
        get: {
          tags: ['Gamification'],
          summary: 'Conquistas do usuário',
          description: 'Lista badges e histórico recente de XP (usa cabeçalho X-User-Id).',
          parameters: [ { name: 'X-User-Id', in: 'header', required: true, schema: { type: 'string' } } ],
          responses: { '200': { description: 'Conquistas retornadas' } }
        }
      },
      '/gamification/v1/badges/auto/process': {
        post: {
          tags: ['Gamification'],
          summary: 'Reprocessar badges automáticos',
          description: 'Força avaliação de badges automáticos para todos ou um usuário (header X-User-Id opcional).',
          parameters: [ { name: 'X-User-Id', in: 'header', required: false, schema: { type: 'string' } } ],
          responses: { '202': { description: 'Processamento iniciado' } }
        }
      },
      '/gamification/v1/ranking/global': {
        get: {
          tags: ['Gamification'],
          summary: 'Ranking global',
          description: 'Top usuários por XP.',
          responses: {
            '200': { description: 'Ranking retornado' }
          }
        }
      },
      '/gamification/v1/ranking/departamento': {
        get: {
          tags: ['Gamification'],
          summary: 'Ranking por departamento',
          description: 'Ranking filtrado (placeholder até relação usuário-departamento na gamificação).',
          parameters: [
            { name: 'X-Departamento-Id', in: 'header', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Ranking retornado' }
          }
        }
      },
      // Notification Service Routes - /notifications/v1
      '/notifications/v1': {
        get: {
          tags: ['Notifications'],
          summary: 'Listar notificações',
          description: 'Retorna as notificações do usuário',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Lista de notificações' },
            '401': { description: 'Não autorizado' }
          }
        },
        post: {
          tags: ['Notifications'],
          summary: 'Criar notificação',
          description: 'Cria uma nova notificação',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    usuario_id: { type: 'string', format: 'uuid', description: 'ID do usuário destinatário' },
                    titulo: { type: 'string', description: 'Título da notificação' },
                    mensagem: { type: 'string', description: 'Conteúdo da notificação' },
                    tipo: { type: 'string', description: 'Tipo da notificação' },
                    canal: { type: 'string', description: 'Canal de entrega (email, push, etc.)' }
                  },
                  required: ['usuario_id', 'titulo', 'mensagem']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Notificação criada com sucesso' },
            '401': { description: 'Não autorizado' }
          }
        }
      }
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      'x-events': {
        'course.module.completed.v1': { summary: 'Módulo concluído', payload: { type:'object', properties:{ enrollmentId:{type:'string'}, courseId:{type:'string'}, userId:{type:'string'}, moduleId:{type:'string'}, progressPercent:{type:'number'}, completedCourse:{type:'boolean'} } } },
        'course.completed.v1': { summary: 'Curso concluído', payload: { type:'object', properties:{ enrollmentId:{type:'string'}, courseId:{type:'string'}, userId:{type:'string'}, totalProgress:{type:'number'} } } },
        'xp.adjusted.v1': { summary: 'XP ajustado', payload: { type:'object', properties:{ userId:{type:'string'}, delta:{type:'number'}, newTotalXp:{type:'number'}, level:{type:'string'}, sourceEventId:{type:'string'} } } },
        'assessment.passed.v1': { summary: 'Avaliação aprovada', payload: { type:'object', properties:{ assessmentCode:{type:'string'}, courseId:{type:'string'}, userId:{type:'string'}, score:{type:'number'}, passed:{type:'boolean'} } } },
        'assessment.failed.v1': { summary: 'Avaliação reprovada', payload: { type:'object', properties:{ assessmentCode:{type:'string'}, courseId:{type:'string'}, userId:{type:'string'}, score:{type:'number'}, passed:{type:'boolean'} } } }
      }
    },
    security: [ { bearerAuth: [] } ],
    tags: [
      { name: 'Authentication', description: 'Autenticação e autorização' },
      { name: 'Users', description: 'Gerenciamento de usuários' },
      { name: 'Courses', description: 'Gerenciamento de cursos' },
      { name: 'Assessments', description: 'Avaliações e questionários' },
      { name: 'Progress', description: 'Progresso e inscrições dos usuários' },
      { name: 'Gamification', description: 'Sistema de gamificação e badges' },
      { name: 'Notifications', description: 'Sistema de notificações' }
    ]
  }; 
}
