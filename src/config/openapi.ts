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
        },
        post: {
          tags: ['Users'],
          summary: 'Criar departamento (ADMIN)',
          description: 'Cria um novo departamento. Requer role ADMIN.',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    codigo: { type: 'string', minLength: 1, description: 'Código único do departamento' },
                    nome: { type: 'string', minLength: 1, description: 'Nome do departamento' },
                    gestor_id: { type: 'string', format: 'uuid', description: 'ID do gestor (opcional)' }
                  },
                  required: ['codigo', 'nome']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Departamento criado com sucesso' },
            '400': { description: 'Dados inválidos' },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Acesso negado - apenas ADMIN' },
            '409': { description: 'Código já existe' }
          }
        }
      },
      '/users/v1/departments/{codigo}': {
        patch: {
          tags: ['Users'],
          summary: 'Atualizar departamento (ADMIN)',
          description: 'Atualiza informações de um departamento. Requer role ADMIN.',
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'codigo',
              in: 'path',
              required: true,
              schema: { type: 'string' },
              description: 'Código do departamento'
            }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    nome: { type: 'string', minLength: 1, description: 'Nome do departamento' },
                    gestor_id: { type: 'string', format: 'uuid', description: 'ID do gestor' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Departamento atualizado com sucesso' },
            '400': { description: 'Dados inválidos' },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Acesso negado - apenas ADMIN' },
            '404': { description: 'Departamento não encontrado' }
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
        get: {
          tags: ['Users'],
          summary: 'Listar usuários (ADMIN)',
          description: 'Lista todos os usuários com filtros. Requer role ADMIN.',
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['ATIVO', 'INATIVO'] }, description: 'Filtrar por status' },
            { name: 'departamento_id', in: 'query', schema: { type: 'string' }, description: 'Filtrar por departamento' },
            { name: 'tipo_usuario', in: 'query', schema: { type: 'string', enum: ['FUNCIONARIO', 'INSTRUTOR', 'ADMIN'] }, description: 'Filtrar por tipo' },
            { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Buscar por nome, email ou CPF' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 50, minimum: 1, maximum: 200 }, description: 'Limite de resultados' },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0, minimum: 0 }, description: 'Offset para paginação' }
          ],
          responses: {
            '200': { description: 'Lista de usuários com total' },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Acesso negado - apenas ADMIN' }
          }
        },
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
                    email: { type: 'string', format: 'email', description: 'Email (apenas ADMIN pode alterar)' },
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
            '200': { description: 'Dados do usuário' },
            '404': { description: 'Usuário não encontrado' }
          }
        },
        patch: {
          tags: ['Users'],
          summary: 'Atualizar usuário (ADMIN ou próprio)',
          description: 'Atualização completa de usuário. ADMIN pode alterar tudo, usuário comum apenas dados básicos. Para promover a INSTRUTOR enviar tipo_usuario=INSTRUTOR.',
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
                    nome: { type: 'string', minLength: 1, description: 'Nome completo' },
                    cpf: { type: 'string', pattern: '^\\d{11}$', description: 'CPF com 11 dígitos' },
                    email: { type: 'string', format: 'email', description: 'Email (apenas ADMIN)' },
                    departamento_id: { type: 'string', description: 'ID do departamento' },
                    cargo: { type: 'string', description: 'Cargo do funcionário' },
                    status: { type: 'string', enum: ['ATIVO', 'INATIVO'], description: 'Status (apenas ADMIN)' },
                    tipo_usuario: { type: 'string', enum: ['FUNCIONARIO', 'INSTRUTOR', 'ADMIN'], description: 'Tipo de usuário (apenas ADMIN)' },
                    biografia: { type: 'string', description: 'Biografia (apenas para INSTRUTOR)' },
                    cursos_id: { type: 'array', items: { type: 'string' }, description: 'Especialidades do instrutor' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Usuário atualizado com sucesso' },
            '400': { description: 'Dados inválidos' },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Sem permissão para este campo' },
            '404': { description: 'Usuário não encontrado' }
          }
        }
      },
      '/users/v1/instructors': {
        get: {
          tags: ['Users'],
          summary: 'Listar instrutores',
          description: 'Retorna lista de instrutores ativos com especialidades e avaliações',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Lista de instrutores' }
          }
        }
      },
      '/users/v1/{id}/achievements': {
        get: {
          tags: ['Users'],
          summary: 'Obter conquistas do usuário',
          description: 'Retorna histórico de conquistas, badges e XP total do usuário',
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
            '200': { description: 'Conquistas do usuário' },
            '404': { description: 'Usuário não encontrado' }
          }
        }
      },
      '/users/v1/dashboard': {
        get: {
          tags: ['Users'],
          summary: 'Dashboard inteligente baseado no perfil',
          description: '🎯 **Dashboard único que adapta conteúdo baseado no role do usuário:**\n\n👤 **FUNCIONARIO** (R03): XP, nível, badges, cursos em andamento/concluídos/disponíveis, ranking departamental, timeline de atividades\n\n👨‍🏫 **INSTRUTOR** (R11): Cursos que ministra, estatísticas de conclusão, avaliações pendentes, métricas de performance\n\n👑 **ADMIN** (R17): Métricas gerais da plataforma, cursos populares, engajamento por departamento, alertas do sistema',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { 
              description: 'Dashboard específico baseado no role do usuário',
              content: {
                'application/json': {
                  examples: {
                    funcionario: {
                      summary: 'Dashboard Funcionário',
                      value: {
                        tipo_dashboard: 'funcionario',
                        xp_atual: 2500,
                        nivel_atual: 3,
                        proximo_badge: 'Ouro',
                        progresso_nivel: 50,
                        cursos_em_andamento: [{ codigo: 'JS101', titulo: 'JavaScript Básico', progresso: 75 }],
                        cursos_concluidos: [{ codigo: 'HTML101', titulo: 'HTML Básico', xp_oferecido: 100 }],
                        menu_operacoes: [{ nome: 'Catálogo de Cursos', url: '/catalogo', icone: 'book' }]
                      }
                    },
                    instrutor: {
                      summary: 'Dashboard Instrutor',
                      value: {
                        tipo_dashboard: 'instrutor',
                        cursos: [{ codigo: 'JS101', titulo: 'JavaScript Básico', inscritos: 25, taxa_conclusao: 80 }],
                        pendentes_correcao: 5,
                        metricas: { taxa_conclusao_geral: 75, total_alunos: 150 }
                      }
                    },
                    administrador: {
                      summary: 'Dashboard Administrador',
                      value: {
                        tipo_dashboard: 'administrador',
                        metricas_gerais: { usuarios_ativos: 500, total_cursos: 45, taxa_conclusao_geral: 78.5 },
                        cursos_populares: [{ codigo: 'JS101', titulo: 'JavaScript', inscricoes: 200 }],
                        alertas: [{ tipo: 'Curso com baixa avaliação', descricao: 'Curso XYZ precisa de atenção' }]
                      }
                    }
                  }
                }
              }
            },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Acesso negado' }
          }
        }
      },
      '/users/v1/dashboard/funcionario': {
        get: {
          tags: ['Users'],
          summary: 'Dashboard específico do funcionário',
          description: 'Força exibição do dashboard de funcionário independente do role',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Dashboard do funcionário com XP, cursos e gamificação' },
            '401': { description: 'Não autorizado' }
          }
        }
      },
      '/users/v1/dashboard/instrutor': {
        get: {
          tags: ['Users'],
          summary: 'Dashboard específico do instrutor',
          description: 'Dashboard para instrutores com estatísticas dos cursos que ministram',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { description: 'Dashboard do instrutor com cursos e métricas' },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Acesso negado - requer role INSTRUTOR' }
          }
        }
      },
      '/users/v1/admin/dashboard': {
        get: {
          tags: ['Users'],
          summary: 'Dashboard administrativo (ADMIN)',
          description: 'Dashboard completo para administradores com métricas gerais da plataforma, alertas e análises de engajamento',
          security: [{ bearerAuth: [] }],
          responses: {
            '200': { 
              description: 'Dashboard administrativo completo',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      tipo_dashboard: { type: 'string', example: 'administrador' },
                      metricas_gerais: {
                        type: 'object',
                        properties: {
                          usuarios_ativos: { type: 'integer' },
                          total_usuarios: { type: 'integer' },
                          total_cursos: { type: 'integer' },
                          taxa_conclusao_geral: { type: 'number' }
                        }
                      },
                      cursos_populares: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            codigo: { type: 'string' },
                            titulo: { type: 'string' },
                            inscricoes: { type: 'integer' }
                          }
                        }
                      },
                      alertas: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            tipo: { type: 'string' },
                            descricao: { type: 'string' },
                            prioridade: { type: 'string', enum: ['alta', 'media', 'baixa'] }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '401': { description: 'Não autorizado' },
            '403': { description: 'Acesso negado - apenas ADMIN' }
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
                    nivel_dificuldade: { type: 'string', enum: ['Básico', 'Intermediário', 'Avançado'], description: 'Nível de dificuldade' },
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
        },
        patch: {
          tags: ['Courses'],
          summary: 'Atualizar curso',
          description: 'Atualiza dados do curso (bloqueado se houver inscrições ativas).',
          parameters: [ { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } } ],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { titulo:{type:'string'}, descricao:{type:'string'}, categoria_id:{type:'string'}, duracao_estimada:{type:'integer'}, xp_oferecido:{type:'integer'}, nivel_dificuldade:{type:'string', enum:['Básico','Intermediário','Avançado']} } } } }
          },
          responses: {
            '200': { description: 'Atualizado' },
            '404': { description: 'Curso não encontrado' },
            '409': { description: 'Curso possui inscrições ativas' }
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
      '/courses/v1/{codigo}/active': {
        patch: {
          tags: ['Courses'],
          summary: 'Alterar status ativo',
          parameters: [ { name: 'codigo', in:'path', required:true, schema:{ type:'string' } } ],
          requestBody: { required:true, content: { 'application/json': { schema: { type:'object', required:['active'], properties: { active:{ type:'boolean' } } } } } },
          responses: { '200': { description: 'Status atualizado' }, '404': { description: 'Curso não encontrado' } }
        }
      },
      '/courses/v1/categories': {
        get: {
          tags: ['Courses'],
          summary: 'Listar categorias',
          responses: { '200': { description: 'Lista de categorias' } }
        },
        post: {
          tags: ['Courses'],
            summary: 'Criar categoria',
            requestBody: { required: true, content: { 'application/json': { schema: { type:'object', required:['codigo','nome'], properties: { codigo:{type:'string'}, nome:{type:'string'}, descricao:{type:'string'}, cor_hex:{type:'string'} } } } } },
            responses: { '201': { description: 'Criado' }, '409': { description: 'Duplicado' } }
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
                    conteudo: { type: 'string' },
                    ordem: { type: 'integer' },
                    obrigatorio: { type: 'boolean' },
                    xp: { type: 'integer' },
                    tipo_conteudo: { type: 'string' }
                  },
                  required: ['titulo']
                }
              }
            }
          },
          responses: {
            '201': { description: 'Módulo criado' },
            '404': { description: 'Curso não encontrado' }
          }
        }
      },
      '/courses/v1/{codigo}/modulos/{moduloId}': {
        patch: {
          tags: ['Courses'],
          summary: 'Atualizar módulo',
          parameters: [
            { name: 'codigo', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'moduloId', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    titulo: { type: 'string' },
                    conteudo: { type: 'string' },
                    ordem: { type: 'integer' },
                    obrigatorio: { type: 'boolean' },
                    xp: { type: 'integer' },
                    tipo_conteudo: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Módulo atualizado' },
            '404': { description: 'Módulo não encontrado' }
          }
        }
      },
      '/courses/v1/modulos/{moduloId}/materiais': {
        get: {
          tags: ['Courses'],
          summary: 'Listar materiais do módulo',
          parameters: [ { name: 'moduloId', in:'path', required:true, schema:{ type:'string' } } ],
          responses: { '200': { description: 'Lista de materiais' }, '404': { description: 'Módulo não encontrado' } }
        },
        post: {
          tags: ['Courses'],
          summary: 'Upload de material para o módulo',
          description: 'Faz upload direto de arquivo via Base64. O sistema detecta automaticamente: tipo, tamanho e salva no storage correto.',
          parameters: [ { name: 'moduloId', in:'path', required:true, schema:{ type:'string' } } ],
          requestBody: { 
            required: true, 
            content: { 
              'application/json': { 
                schema: { 
                  type: 'object', 
                  required: ['nome_arquivo', 'base64'], 
                  properties: { 
                    nome_arquivo: { 
                      type: 'string', 
                      description: 'Nome do arquivo com extensão', 
                      example: 'apostila-cybersecurity.pdf' 
                    },
                    base64: { 
                      type: 'string', 
                      description: 'Conteúdo do arquivo codificado em Base64',
                      example: 'JVBERi0xLjQKJdPr6eEKMSAwIG9iago8PC9U...'
                    }
                  }
                } 
              } 
            } 
          },
          responses: { 
            '201': { 
              description: 'Material enviado e armazenado com sucesso',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      created: { type: 'boolean' },
                      storage_key: { type: 'string' },
                      tamanho: { type: 'integer' },
                      tipo_arquivo: { type: 'string' }
                    }
                  }
                }
              }
            }, 
            '400': { description: 'Tipo de arquivo não suportado ou Base64 inválido' },
            '404': { description: 'Módulo não encontrado' }
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
  },
  post: {
          tags: ['Assessments'],
          summary: 'Submeter respostas',
          description: 'Submete respostas do usuário e realiza correção automática.',
          parameters: [ { name:'codigo', in:'path', required:true, schema:{ type:'string' } } ],
          requestBody: { required:true, content: { 'application/json': { schema: { type:'object', required:['userId','attemptId','respostas'], properties: { userId:{type:'string'}, attemptId:{type:'string'}, respostas:{ type:'array', items:{ type:'object', required:['questao_id','resposta'], properties:{ questao_id:{type:'string'}, resposta:{type:'string'} } } } } } } } },
          responses: { '200': { description: 'Resultado' }, '404': { description: 'Avaliação não encontrada' } }
        }
  },
  '/assessments/v1/{codigo}/questions': {
    post: { tags:['Assessments'], summary:'Adicionar questão', parameters:[{ name:'codigo', in:'path', required:true, schema:{ type:'string' } }], requestBody:{ required:true, content:{ 'application/json': { schema:{ type:'object', required:['enunciado','tipo'], properties:{ enunciado:{type:'string'}, tipo:{type:'string', enum:['MULTIPLA_ESCOLHA','VERDADEIRO_FALSO','DISSERTATIVA']}, opcoes_resposta:{type:'array', items:{type:'string'}}, resposta_correta:{type:'string'}, peso:{type:'number'} } } } } }, responses:{ '201': { description:'Criado' } } },
    get: { tags:['Assessments'], summary:'Listar questões', parameters:[{ name:'codigo', in:'path', required:true, schema:{ type:'string' } }], responses:{ '200': { description:'Lista retornada'} } }
  },
  '/assessments/v1/{codigo}/attempts/start': {
    post: { tags:['Assessments'], summary:'Iniciar tentativa', parameters:[{ name:'codigo', in:'path', required:true, schema:{ type:'string' } }], requestBody:{ required:false, content:{ 'application/json': { schema:{ type:'object', properties:{ userId:{type:'string'} } } } } }, responses:{ '201': { description:'Iniciada (recovery true se tentativa de recuperação)' }, '409': { description:'Limite de tentativas ou já aprovado' } } }
  },
  '/assessments/v1/questions/{questaoId}/alternatives': {
        post: { tags:['Assessments'], summary:'Adicionar alternativa', parameters:[{ name:'questaoId', in:'path', required:true, schema:{ type:'string' } }], requestBody:{ required:true, content:{ 'application/json': { schema:{ type:'object', required:['texto','correta'], properties:{ texto:{type:'string'}, correta:{type:'boolean'} } } } } }, responses:{ '201': { description:'Criado' } } },
        get: { tags:['Assessments'], summary:'Listar alternativas', parameters:[{ name:'questaoId', in:'path', required:true, schema:{ type:'string' } }], responses:{ '200': { description:'Lista retornada'} } }
  },
  '/assessments/v1/attempts/{attemptId}/dissertative': {
    get: { tags:['Assessments'], summary:'Listar respostas dissertativas', parameters:[{ name:'attemptId', in:'path', required:true, schema:{ type:'string' } }], responses:{ '200': { description:'Lista retornada' }, '404': { description:'Tentativa não encontrada' }, '409': { description:'Não pendente de revisão' } } }
  },
  '/assessments/v1/attempts/{attemptId}/review': {
    patch: { tags:['Assessments'], summary:'Revisar tentativa (dissertativas)', parameters:[{ name:'attemptId', in:'path', required:true, schema:{ type:'string' } }], requestBody:{ required:true, content:{ 'application/json': { schema:{ type:'object', required:['scores'], properties:{ notaMinima:{type:'number'}, scores:{ type:'array', items:{ type:'object', required:['respostaId','pontuacao'], properties:{ respostaId:{type:'string'}, pontuacao:{type:'number'} } } } } } } } }, responses:{ '200': { description:'Revisado' }, '404': { description:'Tentativa não encontrada' }, '409': { description:'Não pendente de revisão' } } }
  },
  // Fim Assessment
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
      '/progress/v1/inscricoes/usuario/{userId}': {
        get: {
          tags: ['Progress'],
          summary: 'Listar inscrições do usuário',
          parameters: [ { name: 'userId', in:'path', required:true, schema:{ type:'string' } } ],
          responses: { '200': { description: 'Lista retornada' } }
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
      '/progress/v1/certificates/user/{userId}': {
        get: {
          tags: ['Progress'],
          summary: 'Listar certificados do usuário',
          parameters: [ { name:'userId', in:'path', required:true, schema:{ type:'string' } } ],
          responses: { '200': { description: 'Lista retornada' } }
        }
      },
      '/progress/v1/certificates/enrollment/{enrollmentId}': {
        post: {
          tags: ['Progress'],
          summary: 'Emitir ou recuperar certificado',
          parameters: [ { name:'enrollmentId', in:'path', required:true, schema:{ type:'string' } } ],
          responses: { '201': { description: 'Certificado emitido ou já existente' }, '404': { description:'Inscrição não encontrada' }, '409': { description:'Curso não concluído' } }
        }
      },
      '/progress/v1/certificates/enrollment/{enrollmentId}/pdf': {
        get: {
          tags: ['Progress'],
          summary: 'Gerar ou obter link PDF do certificado',
          parameters: [ { name:'enrollmentId', in:'path', required:true, schema:{ type:'string' } } ],
          responses: { '200': { description: 'Detalhes/URL do PDF' }, '404': { description: 'Inscrição não encontrada' } }
        }
      },
      '/progress/v1/certificates/validate/{code}': {
        get: {
          tags: ['Progress'],
          summary: 'Validar certificado (código + hash)',
          parameters: [ { name:'code', in:'path', required:true, schema:{ type:'string' } }, { name:'hash', in:'query', required:true, schema:{ type:'string' } } ],
          responses: { '200': { description:'Resultado validação' }, '400': { description:'Parâmetro ausente' }, '404': { description:'Não encontrado' } }
        }
      },
      '/progress/v1/tracks': {
        get: { tags: ['Progress'], summary: 'Listar trilhas (placeholder)', responses: { '200': { description: 'Lista retornada' } } }
      },
      '/progress/v1/tracks/user/{userId}': {
        get: { tags: ['Progress'], summary: 'Progresso em trilhas do usuário (placeholder)', parameters: [ { name:'userId', in:'path', required:true, schema:{ type:'string' } } ], responses: { '200': { description: 'Dados retornados' } } }
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
      '/gamification/v1/ranking/monthly': {
        get: {
          tags: ['Gamification'],
          summary: 'Ranking mensal',
          description: 'Ranking limitado ao mês atual.',
          responses: { '200': { description: 'Ranking retornado' } }
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
      '/gamification/v1/users/{id}/badges': {
        get: {
          tags: ['Gamification'],
          summary: 'Badges do usuário',
          parameters: [ { name: 'id', in:'path', required:true, schema:{ type:'string' } } ],
          responses: { '200': { description: 'Lista de badges' }, '404': { description: 'Usuário não encontrado' } }
        }
      },
      '/gamification/v1/users/{id}/xp-history': {
        get: {
          tags: ['Gamification'],
          summary: 'Histórico de XP do usuário',
          parameters: [ { name: 'id', in:'path', required:true, schema:{ type:'string' } } ],
          responses: { '200': { description: 'Histórico retornado' } }
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
