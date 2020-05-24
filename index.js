const fs = require('fs')
const swagger = JSON.parse(fs.readFileSync('./a.json'))
const swagger_new = JSON.parse(fs.readFileSync('./b.json'))
const { deepClone, curry } = require('./utils')


const getSchema = curry((schemas, name) => {
  if (name in schemas) return deepClone(schemas[name])
  throw new Error(`Cannot find schema named ${name}`)
})

const getRefName = ref => {
  const [, , , ...name] = ref.split('/')
  return name.join('/')
}
const getRefCategory = ref => {
  const [, , category] = ref.split('/')
  return category
}

const getReqBody = curry((schemas, name, getRef) => {
  if (name in schemas.components.requestBodies) {
    const res = cloneDeep(schemas.components.requestBodies[name])
    if (res.content && '$ref' in res.content[Object.keys(res.content)[0]].schema) {
      return getRef(schemas, res.content[Object.keys(res.content)[0]].schema.$ref)
    }
    if (
      res.content &&
      res.content[Object.keys(res.content)[0]] &&
      res.content[Object.keys(res.content)[0]].schema
    ) {
      return res.content[Object.keys(res.content)[0]].schema
    }
    return res
  }
  throw new Error(`Cannot find schema named ${name}`)
})

const getRef = curry((swagger, ref) => {
  const category = getRefCategory(ref)
  const name = getRefName(ref)
  if (category === 'parameters') return getParameters(swagger.components.parameters, name)
  if (category === 'schemas') return getSchema(swagger.components.schemas, name)
  if (category === 'requestBodies') return getReqBody(swagger, name, getRef)

  throw new Error(`Cannot find ref: ${ref}`)
})

//@TODO: allof等
const transformJsonSchema = function(body, body_new, options, path='') {
  // console.log('body', body, body.default === body_new.default )

  const error = []

  if(body.default !== body_new.default || body.description !== body_new.description ||body.example !== body_new.example) {
    error.push({
      [path]: {
        defaultValue:  {before: body.default,  end: body_new.default },
        description:  { before :body.description,  end:  body_new.description },
        example: { before :body.example,  end:  body_new.example },
      }
    })
  }


  if ('$ref' in body) {
    //@TODO:这里可以做一个map 把相同的schema 记录下来
    const ref = options.getRef(body.$ref)
    const ref_new = options.getNewRef(body_new.$ref)
    const e = transformJsonSchema(ref, ref_new, options, path)
    error.push(...e)
    return error
  }


  if (body.type ==='object') {
    if(body.properties) {

      Object.entries(body.properties).map(([key, value]) => {
        if(!body_new.properties[key]) {
          error.push({
            [`${path}.${key}`]:{
            isDel: true,
            name: key
          }})
          return error
        }
        const e  = transformJsonSchema(value, body_new.properties[key], options, !path? key : path+'.'+key)
       error.push(...e)
       return error
      })
    }
  }

  return error

}

const compare = function(before, end) {
  const paths = before.paths 
  const paths_new = end.paths || []
  Object.entries(paths).map(([path, obj]) => {
    const result = {
      modified: false,
      deleted: false,
      added: false,
      info: {}
    }
    const method = Object.keys(obj)[0]

    if(!paths_new[path])  { 
      result.deleted = true
      return result
    }
    const value_new = paths_new[path][method]


    if(!value_new)  { 
      result.info.method = 'change' 
      return result
    }

    const response_new = value_new.responses['200'].content
    const contentTypes_new = Object.keys(response_new)[0]




    const value = obj[method]
    const response = value.responses['200'].content
    const contentTypes = Object.keys(response)[0]

    if(contentTypes_new !== contentTypes) { 
      obj.info.contentTypes = 'change' 
      return result
    }


    const body = response[contentTypes].schema
    const body_new = response_new[contentTypes_new].schema
    const a = transformJsonSchema(body, body_new, {getRef: getRef(before), getNewRef: getRef(end)}, '')
    console.log('a', JSON.stringify(a, null, 2) )
  })
}

compare(swagger.info, swagger_new.info)
// compareSchema(swagger)