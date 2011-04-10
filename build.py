#!/usr/bin/python

module = 'hackny'
input_path = 'src/'
output_path = 'www/generated.js'

import re, os, sys, time

def sources():
    return [os.path.join(base, f) for base, folders, files in \
        os.walk(input_path) for f in files if f.endswith('.js')]

def compile(sources):
    return '\n'.join('// %s\n%s' % (path, open(path).read()) for path in sources)

def build():
    data = 'var ' + module + ' = (function() {\nvar exports = {};\n\n' + compile(sources()) + '\nreturn exports;\n})();\n'
    print 'built %s (%u lines)' % (output_path, len(data.split('\n')))
    open(output_path, 'w').write(data)

def stat():
    return [os.stat(file).st_mtime for file in sources()]

def monitor():
    a = stat()
    while True:
        time.sleep(0.5)
        b = stat()
        if a != b:
            a = b
            build()

if __name__ == '__main__':
    build()
    if 'debug' in sys.argv:
        monitor()
