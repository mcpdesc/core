import type { JsonObject, JsonValue } from './model.js';

type Order = (value: JsonValue, modern: boolean) => JsonValue;

function isObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function fixed(
  sequence: string,
  children: Readonly<Record<string, Order>> = {},
  modernMeta = false,
): Order {
  const fields = sequence.split(' ');
  return (value, modern) => {
    if (!isObject(value)) return value;
    const known = fields.filter(
      (field) => !modernMeta || modern || field !== '_meta',
    );
    const fieldSet = new Set(known);
    return Object.fromEntries([
      ...known
        .filter((field) => Object.hasOwn(value, field))
        .map((field) => {
          const child = value[field]!;
          return [
            field,
            Object.hasOwn(children, field)
              ? children[field]!(child, modern)
              : child,
          ];
        }),
      ...Object.entries(value).filter(([field]) => !fieldSet.has(field)),
    ]);
  };
}

function arrayOf(order: Order): Order {
  return (value, modern) =>
    Array.isArray(value) ? value.map((child) => order(child, modern)) : value;
}

function mapOf(order: Order): Order {
  return (value, modern) =>
    isObject(value)
      ? Object.fromEntries(
          Object.entries(value).map(([key, child]) => [
            key,
            order(child, modern),
          ]),
        )
      : value;
}

function variant(
  discriminator: string,
  choices: Readonly<Record<string, Order>>,
  absent?: Order,
): Order {
  return (value, modern) => {
    if (!isObject(value)) return value;
    if (!Object.hasOwn(value, discriminator)) {
      return absent ? absent(value, modern) : value;
    }
    const kind = value[discriminator];
    return typeof kind === 'string' && Object.hasOwn(choices, kind)
      ? choices[kind]!(value, modern)
      : value;
  };
}

function complete(order: Order): Order {
  return variant('resultType', { complete: order }, order);
}

function referenceOr(order: Order): Order {
  const reference = fixed('$componentRef');
  return (value, modern) => {
    if (isObject(value) && Object.hasOwn(value, '$componentRef')) {
      return typeof value.$componentRef === 'string'
        ? reference(value, modern)
        : value;
    }
    return order(value, modern);
  };
}

const icon = fixed('src mimeType sizes theme');
const icons = arrayOf(icon);
const resourceAnnotations = fixed('audience priority lastModified');
const toolAnnotations = fixed(
  'title readOnlyHint destructiveHint idempotentHint openWorldHint',
);
const execution = fixed('taskSupport');
const clientRequirements = fixed(
  'roots sampling elicitation tasks extensions experimental',
);
const elicitation = variant('mode', {
  form: fixed(
    'name mode message protocolVersions when requestedSchema url onDecline onCancel',
  ),
  url: fixed(
    'name mode message protocolVersions when requestedSchema url onDecline onCancel',
  ),
});

const resourceText = fixed('uri mimeType text _meta');
const resourceBlob = fixed('uri mimeType blob _meta');
const resourceContents: Order = (value, modern) => {
  if (!isObject(value)) return value;
  const text = Object.hasOwn(value, 'text');
  const blob = Object.hasOwn(value, 'blob');
  if (text === blob) return value;
  if (text && typeof value.text === 'string')
    return resourceText(value, modern);
  if (blob && typeof value.blob === 'string')
    return resourceBlob(value, modern);
  return value;
};
const contentVariants = {
  text: fixed('type text annotations _meta', {
    annotations: resourceAnnotations,
  }),
  image: fixed('type mimeType data annotations _meta', {
    annotations: resourceAnnotations,
  }),
  audio: fixed('type mimeType data annotations _meta', {
    annotations: resourceAnnotations,
  }),
  resource: fixed('type resource annotations _meta', {
    resource: resourceContents,
    annotations: resourceAnnotations,
  }),
  resource_link: fixed(
    'type uri name title description icons mimeType size annotations _meta',
    { icons, annotations: resourceAnnotations },
  ),
};
const content = variant('type', contentVariants);
const toolResult = complete(
  fixed('resultType isError content structuredContent _meta', {
    content: arrayOf(content),
  }),
);
const readResult = complete(
  fixed('resultType contents cacheScope ttlMs _meta', {
    contents: arrayOf(resourceContents),
  }),
);
const promptResult = complete(
  fixed('resultType description messages _meta', {
    messages: arrayOf(fixed('role content', { content })),
  }),
);
const completionResult = complete(
  fixed('resultType completion _meta', {
    completion: fixed('values total hasMore'),
  }),
);
const toolExample = referenceOr(fixed('input result', { result: toolResult }));
const resourceExample = referenceOr(fixed('result', { result: readResult }));
const templateExample = referenceOr(
  fixed('uri result', { result: readResult }),
);
const promptExample = referenceOr(
  fixed('arguments result', { result: promptResult }),
);
const completionExample = fixed('argument context result', {
  argument: fixed('name value'),
  context: fixed('arguments'),
  result: completionResult,
});

const samplingContent = variant('type', {
  ...contentVariants,
  tool_use: fixed('type id name input'),
  tool_result: fixed('type toolUseId isError content', {
    content: (value, modern) =>
      Array.isArray(value)
        ? arrayOf(content)(value, modern)
        : content(value, modern),
  }),
});
const samplingMessageContent: Order = (value, modern) =>
  Array.isArray(value)
    ? arrayOf(samplingContent)(value, modern)
    : samplingContent(value, modern);
const samplingRequest = fixed(
  'messages systemPrompt includeContext modelPreferences maxTokens temperature stopSequences tools toolChoice metadata',
  {
    messages: arrayOf(
      fixed('role content', { content: samplingMessageContent }),
    ),
    modelPreferences: fixed(
      'hints intelligencePriority speedPriority costPriority',
      { hints: arrayOf(fixed('name')) },
    ),
    tools: arrayOf(
      fixed('name title description inputSchema annotations', {
        annotations: toolAnnotations,
      }),
    ),
    toolChoice: fixed('mode'),
  },
);
const samplingResult = fixed(
  'role content model stopReason _meta',
  { content: samplingMessageContent },
  true,
);
const interactionStep = variant('type', {
  elicitation: fixed('type declaration request response', {
    request: variant('mode', {
      form: fixed('mode message requestedSchema'),
      url: fixed('mode message url'),
    }),
    response: variant('action', {
      accept: fixed('action content _meta', {}, true),
      decline: fixed('action _meta', {}, true),
      cancel: fixed('action _meta', {}, true),
    }),
  }),
  roots: fixed('type request response', {
    response: fixed(
      'roots _meta',
      { roots: arrayOf(fixed('uri name _meta', {}, true)) },
      true,
    ),
  }),
  sampling: fixed('type request response', {
    request: samplingRequest,
    response: samplingResult,
  }),
});
const interactionExample = fixed('input steps result', {
  steps: arrayOf(interactionStep),
  result: toolResult,
});

const commonChildren = {
  icons,
  clientRequirements,
  elicitations: arrayOf(elicitation),
};
const tool = fixed(
  'name title description icons tags deprecated protocolVersions inputSchema outputSchema annotations execution security clientRequirements elicitations examples interactionExamples _meta',
  {
    ...commonChildren,
    annotations: toolAnnotations,
    execution,
    examples: mapOf(toolExample),
    interactionExamples: mapOf(interactionExample),
  },
);
const resource = fixed(
  'uri name title description icons tags deprecated protocolVersions mimeType size annotations security clientRequirements elicitations examples _meta',
  {
    ...commonChildren,
    annotations: resourceAnnotations,
    examples: mapOf(resourceExample),
  },
);
const resourceTemplate = fixed(
  'uriTemplate name title description icons tags deprecated protocolVersions mimeType annotations security clientRequirements elicitations examples completionExamples _meta',
  {
    ...commonChildren,
    annotations: resourceAnnotations,
    examples: mapOf(templateExample),
    completionExamples: mapOf(completionExample),
  },
);
const prompt = fixed(
  'name title description icons tags deprecated protocolVersions arguments security clientRequirements elicitations examples completionExamples _meta',
  {
    ...commonChildren,
    arguments: arrayOf(fixed('name title description required')),
    examples: mapOf(promptExample),
    completionExamples: mapOf(completionExample),
  },
);
const nativeOrders = { tool, resource, resourceTemplate, prompt };

export function orderNativeValue(
  value: JsonObject,
  kind: keyof typeof nativeOrders,
): JsonObject {
  return nativeOrders[kind](value, true) as JsonObject;
}

const oauthFlow = fixed('authorizationUrl tokenUrl refreshUrl scopes');
const securityScheme = variant('type', {
  http: fixed('type scheme bearerFormat description'),
  apiKey: fixed('type in name description'),
  oauth2: fixed('type description flows', {
    flows: fixed('authorizationCode clientCredentials implicit password', {
      authorizationCode: oauthFlow,
      clientCredentials: oauthFlow,
      implicit: oauthFlow,
      password: oauthFlow,
    }),
  }),
  openIdConnect: fixed('type description openIdConnectUrl'),
});
const httpTransport = fixed('type url protocolVersions security');
const transport = variant('type', {
  'streamable-http': httpTransport,
  sse: httpTransport,
  stdio: fixed('type command args env protocolVersions security'),
});
const capabilities = fixed(
  'protocolVersions tools resources prompts logging completions tasks extensions experimental',
  {
    tools: fixed('listChanged'),
    resources: fixed('subscribe listChanged'),
    prompts: fixed('listChanged'),
    tasks: fixed('list cancel requests', {
      requests: fixed('tools', { tools: fixed('call') }),
    }),
  },
);
const document = fixed(
  '$schema mcpdesc info instructions protocolVersions transports securitySchemes security capabilities tools resources resourceTemplates prompts tags components',
  {
    info: fixed(
      'name title version id description icons websiteUrl contact license',
      {
        icons,
        contact: fixed('name url email'),
        license: fixed('name url'),
      },
    ),
    transports: arrayOf(transport),
    securitySchemes: mapOf(securityScheme),
    capabilities: arrayOf(capabilities),
    tools: arrayOf(tool),
    resources: arrayOf(resource),
    resourceTemplates: arrayOf(resourceTemplate),
    prompts: arrayOf(prompt),
    tags: arrayOf(fixed('name description')),
    components: fixed(
      'schemas toolExamples resourceExamples resourceTemplateExamples promptExamples',
      {
        toolExamples: mapOf(toolExample),
        resourceExamples: mapOf(resourceExample),
        resourceTemplateExamples: mapOf(templateExample),
        promptExamples: mapOf(promptExample),
      },
    ),
  },
);

export function orderDocumentValue(value: JsonValue): JsonValue {
  if (
    !isObject(value) ||
    (value.mcpdesc !== '0.8.0' && value.mcpdesc !== '0.9.0')
  ) {
    return value;
  }
  return document(value, value.mcpdesc === '0.9.0');
}
