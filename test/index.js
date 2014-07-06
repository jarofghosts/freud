var path = require('path')
  , fs = require('fs')

var rmrf = require('rimraf')
  , test = require('tape')

var Freud = require('../')

var dst = path.join(__dirname, 'freud-dst')
  , src = path.join(__dirname, 'freud-src')

teardown()

fs.mkdirSync(src)
fs.mkdirSync(dst)

var testStream = test.createStream()

testStream.pipe(process.stdout)
testStream.on('end', teardown)

test('transforms filename', function(t) {
  var compiledFiles = 0
    , unlinkedFiles = 0
    , freud

  freud = Freud(src, dst)

  freud.listen(['mkd', 'md'], function(file) {
    file.name = file.name.replace(/\.[^.]+$/, '.markdown')
    return file
  })

  freud.on('compiled', function (filename) {
    compiledFiles++

    if(compiledFiles === 1) {
      t.equal(filename, 'test1.markdown')
      return fs.writeFileSync(path.join(src, 'test2.mkd'), 'why hello there')
    }

    t.equal(filename, 'test2.markdown')
    freud.stop()
    t.end()
  })

  freud.go(function(err) {
    t.ok(!err)

    fs.writeFileSync(path.join(src, 'test1.md'), 'why hello there')
  })
})

test('optionally ignores case', function(t) {
  var freud = Freud(src, dst, {ignoreCase: true })
  
  freud.listen('md', function(file) {
    file.data = file.data.replace(/duh/, 'huh');
    
    return file
  })

  freud.on('compiling', function(filename) {
    t.equal(filename, 'testcaps.MD')
  })

  freud.on('compiled', function() {
    t.equal(fs.readFileSync(path.join(dst, 'testcaps.MD'), 'utf8'), 'huh')
    freud.stop()
    t.end()
  })

  freud.go(function(err) {
    t.ok(!err)
    fs.writeFileSync(path.join(src, 'testcaps.MD'), 'duh')
  }) 
})

test('can block file writes, and undo', function(t) {
  var freud = Freud(src, dst)

  freud.listen('md', function(file) {
    file.write = false
    return file
  })

  freud.on('compiled', function(filename) {
    t.equal(filename, 'testfile2.md')

    freud.listen('md', function(file) {
      file.write = true
      return file
    })

    freud.recompile('testfile2.md')
  })

  freud.on('recompiled', function(filename) {
    t.equal(filename, 'testfile2.md')
    t.ok(fs.existsSync(path.join(dst, 'testfile2.md')))
    fs.unlinkSync(path.join(src, 'testfile2.md'))
  })

  freud.on('extensionAdded', function(extension) {
    t.equal(extension, 'md')
  })

  freud.on('unlinked', function(filename) {
    t.equal(filename, 'testfile2.md')
    t.ok(!fs.existsSync(path.join(dst, 'testfile2.md')))

    freud.stop()
    t.end()
  })

  freud.on('blocked', function(filename) {
    t.equal(filename, 'testfile2.md')
  })

  freud.go(function(err) {
    t.ok(!err)
    fs.writeFileSync(path.join(src, 'testfile2.md'), '*therefore i am not*')
  })
})


test('transforms files', function(t) {
  var freud = Freud(src, dst)

  freud.listen('*:before', function(file) {
    file.data = file.data.replace(/why/, 'y')
    return file
  })

  freud.listen('txt', function(file) {
    file.data = file.data.replace(/hello/, 'hallo')
    file.name = file.name.replace(/\.txt$/, '.text')
    return file
  })

  freud.listen('*:after', function(file) {
    file.data = file.data.replace(/there/, 'thar')
    return file
  })

  freud.on('extensionAdded', function(extension) {
    t.equal(extension, 'txt')
  })

  freud.on('compiled', function(filename) {
    t.equal(filename, 'testfile.text')
    t.ok(fs.existsSync(path.join(dst, 'testfile.text')))
    t.equal(
        fs.readFileSync(path.join(dst, 'testfile.text'), 'utf8')
      , 'y hallo thar'
    )

    freud.stop()
    t.end()
  })

  freud.go(function (err) {
    t.ok(!err)
    fs.writeFileSync(path.join(src, 'testfile.txt'), 'why hello there')
  })
})

test('has configurable options for dot/squiggle-files', function(t) {
  var read = 0
    , freud

  freud = Freud(src, dst, {monitorDot: true, monitorSquiggle: true})

  freud.listen('txt', function(file) {
    file.data = file.data.replace(/why hello there/, 'howdy')
    return file
  })

  freud.listen('*', function(file) {
    file.data = file.data.replace(/harro/, 'why hello there')
    return file
  })

  freud.on('compiled', function (filename) {
    read++

    if(filename === '.testfile.txt') {
      t.ok(fs.existsSync(path.join(dst, '.testfile.txt')))
    } else if(filename === 'testfile2.txt~') {
      t.ok(fs.existsSync(path.join(dst, 'testfile2.txt~')))
    }

    if(read < 2) return

    freud.stop()
    t.end()
  })

  freud.go(function (err) {
    t.ok(!err)
    fs.writeFileSync(path.join(src, '.testfile.txt'), 'harro')
    fs.writeFileSync(path.join(src, 'testfile2.txt~'), 'harro')
  })
})

test('copies files even if there are no mutations', function(t) {
  var freud = Freud(src, dst)

  freud.on('copied', function(filename) {
    t.equal(filename, 'testfile.txt')
    t.ok(fs.existsSync(path.join(dst, 'testfile.txt')))

    freud.stop()
    t.end()
  })

  freud.go(function (err) {
    t.ok(!err)
    fs.writeFileSync(path.join(src, 'testfile.txt'), 'why hello there')
  })
})

function teardown() {
  rmrf.sync(src)
  rmrf.sync(dst)
}
