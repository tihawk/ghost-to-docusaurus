import fs from 'fs'
import path from 'path'
import https from 'https'

interface TypeList {
  [key: string]: {
    db: {
      meta: object,
      data: {
        posts: {
          "id": string
          "uuid": string
          "title": string
          "slug": string
          "mobiledoc": string
          "html": string
          "comment_id": string
          "plaintext": string
          "feature_image": string
          "featured": number
          "type": string
          "status": "published"
          "locale": any
          "visibility": "public"
          "email_recipient_filter": any
          "author_id": string,
          "created_at": string // /\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d/
          "updated_at": string // /\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d/
          "published_at": string // /\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d/
          "custom_excerpt": any
          "codeinjection_head": any
          "codeinjection_foot": any
          "custom_template": any
          "canonical_url": any
        }[]
        tags: {
          "id": string
          "name": string
          "slug": string
          // "description": null,
          // "feature_image": null,
          // "parent_id": null,
          // "visibility": "public",
          // "og_image": null,
          // "og_title": null,
          // "og_description": null,
          // "twitter_image": null,
          // "twitter_title": null,
          // "twitter_description": null,
          // "meta_title": null,
          // "meta_description": null,
          // "codeinjection_head": null,
          // "codeinjection_foot": null,
          // "canonical_url": null,
          // "accent_color": null,
          "created_at": string // /\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d/
          "updated_at": string // /\d\d\d\d-\d\d-\d\d \d\d:\d\d:\d\d:\d\d/
        }[]
        posts_tags: {
          "id": string
          "post_id": string
          "tag_id": string
          "sort_order": number
        }[]
        users: {
          "id": string
          "name": string
          "slug": string
          "password": string
          "email": string
          "profile_image": string
          // "cover_image": null,
          // "bio": null,
          // "website": null,
          // "location": null,
          // "facebook": null,
          // "twitter": null,
          // "accessibility": "{\"nightShift\":false,\"whatsNew\":{\"lastSeenDate\":\"2021-02-03T16:27:00.000+00:00\"},\"launchComplete\":true}",
          // "status": "active",
          // "locale": null,
          // "visibility": "public",
          // "meta_title": null,
          // "meta_description": null,
          // "tour": null,
          // "last_seen": "2023-02-21 20:29:43",
          // "created_at": "2021-03-18 23:49:10",
          // "updated_at": "2023-02-21 20:29:43"
        }[]
        posts_authors: {
          "id": string
          "post_id": string
          "author_id": string
          "sort_order": number
        }[]
      }
    }[]
  } // adjusting require this in order to some json data type
}
const readPath = './ghost-export/'
const ghostUrl = "https://kblagoev.com"
const overrideAuthors = 'kiroki'
const downloadImages = true
const parseMath = true

export function declareEachJSON(): TypeList {
  const fileNames = fs.readdirSync(readPath).filter(file => file.match(/\.json$/))
  const typeList: TypeList = {}

  fileNames.forEach((fileName: string) => {
    let typeName = fileName.match(/(^.*?)\.json/)
    if (typeName) {
      typeList[typeName[1]] = JSON.parse(fs.readFileSync(readPath + fileName, 'utf8').toString())
    }
  })
  return typeList
}

async function main() {

  const ghostData = declareEachJSON()
  
  if (!fs.existsSync('./docusaurus-import')) {
    fs.mkdirSync('./docusaurus-import')
  }
  for (const filename of Object.keys(ghostData)) {
    const subdir = path.join('./docusaurus-import', filename)
    if (!fs.existsSync(subdir)) {
      fs.mkdirSync(subdir)
    }
  
    const dbData = ghostData[filename].db[0].data
    for (const post of dbData.posts) {
      const htmlToMarkdown = (await import('./parseHtml.mjs')).default
      let content = await htmlToMarkdown({html: post.html})

      if (parseMath) {
        content = content?.
          // replace(/(^|[^\n])\n(?!\n)/g, "$1 ") // https://stackoverflow.com/questions/18011260/regex-to-match-single-new-line-regex-to-match-double-new-line
          // .replace(/\s(\w+)(\n|\s)\[(htt.*)\]/g, ' [$1]($3)')
          replace(/(\\\\\(\s?|\s?\\\\\))/g, '$') // \( math \)
          .replace(/\\\\\\\[\s?|\s?\\\\\]/g, '\n$$$$\n') // \[ math \]
          .replace(/\\_/g, '_')
          // .replace(/\\\\/g, '\\')
      }

      // const htmlContent = post.html//?.replace(/(<\w+>)/g, '\n\t$1').replace(/(<\/\w+>)/g, '\n$1')
      // const figureRegex = new RegExp('(<figure.+?</figure>)', 'g')
      // const figureCaptionRegex = new RegExp('<figcaption>(.+?)</figcaption>')
      // const figures = htmlContent?.match(figureRegex)
      // if (figures?.length) {
      //   for (const figure of figures) {
      //     const cleanFigure = figure.replace(/(<img.*?)(>)/g, '$1/$2') + '\n\n'
  
      //     const caption = figure.match(figureCaptionRegex)
      //     if (caption?.length) {
      //       const cleanCaption = caption[1].replace(/<\/?[\w="\./:\s]+>/g, '')
  
      //       let tempReplaced = content.replace(cleanCaption, cleanFigure)
      //       if (content === tempReplaced) {
      //         console.warn('Couldn\'t find where to place image. Adding it to end of post. Post name:', post.title)
      //         content += '\n' + cleanFigure
      //       } else {
      //         content = tempReplaced
      //       }
      //     }
      //   }
      // }
  
      // __GHOST_URL__/content/images/2021/03/12894449_10153543899080687_1989737611_o.jpg
      const imgMatcher = new RegExp('(__GHOST_URL__/)(.*?)(\.jpg|\.png|\.bmp|\.svg|\.gif|\/")', 'g')
      const imgs = content?.match(imgMatcher)
      content = content?.replace(/__GHOST_URL__/g, '')
      if (downloadImages) {
        if (imgs?.length) {
          for (const img of imgs) {
            const fullUrl = img.replace('__GHOST_URL__', ghostUrl)
            download(fullUrl, subdir, (res: string, err: string) => {
              if (err) console.log(err)
            })
    
          }
        }
      }
  
  
      const postTagsIds = dbData.posts_tags.filter(el => el.post_id === post.id).map(el => el.tag_id)
      const tags: string[] = dbData.tags.filter(el => postTagsIds.includes(el.id)).map(tag => tag.name)
  
      const postAuthorIds = dbData.posts_authors.filter(el => el.post_id === post.id).map(el => el.author_id)
      const authors: typeof dbData.users = dbData.users.filter(el => postAuthorIds.includes(el.id))
  
      let md = '---\n'
      post.slug ? md += `slug: ${post.slug}\n` : ''
      post.title ? md += `title: "${post.title}"\n` : ''
      post.custom_excerpt ? md += `description: "${post.custom_excerpt.replace(/\n/g, '')}"\n` : ''
      if (!overrideAuthors) {
        if (authors.length) {
          md += `authors:\n`
          for (const author of authors) {
            md += `  - name: ${author.name}\n    image_url: ${author.profile_image}\n`
          }
        }
      } else {
        md += `authors: ${overrideAuthors}\n`
      }
      tags.length ? md += `tags: [${tags.join(', ')}]\n` : ''
      md += '---\n\n'
      md += content
  
      const mdFilename = post.published_at?.replace(' ', '-') + post.slug + '.md'
  
      fs.writeFileSync(path.join(subdir, mdFilename), md)
  
    }
  }
  
  function download(url: string, destDir: string, cb: any) {
    const filename = path.basename(url)
    const fileDir = path.join(destDir, 'static', url.replace(/https?:\/\/(.*?)\//, '').replace(filename, ''))
    const relativePath = path.join('static', url.replace(/https?:\/\/(.*?)\//, '').replace(filename, ''), filename)
  
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true })
    }
    const dest = path.join(fileDir, filename)
    const file = fs.createWriteStream(dest);
    const request = https.get(url, function (response) {
      response.pipe(file);
      file.on('finish', function () {
        file.close(() => cb(relativePath));  // close() is async, call cb after close completes.
      });
    }).on('error', function (err) { // Handle errors
      fs.unlink(dest, () => cb(null, err)); // Delete the file async. (But we don't check the result)
      if (cb) cb(null, err.message);
    });
  };
}

main()