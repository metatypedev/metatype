// no-auto-license-header | @generated (pre-commit doesn't support two headers)

/*
Copyright (c) 2016 Tomasz Miąsko

Permission is hereby granted, free of charge, to any
person obtaining a copy of this software and associated
documentation files (the "Software"), to deal in the
Software without restriction, including without
limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software
is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice
shall be included in all copies or substantial portions
of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF
ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED
TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
*/

use core::fmt;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct ParseError;

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        f.write_str("missing closing quote")
    }
}

enum State {
    Delimiter,
    Backslash,
    Unquoted,
    UnquotedBackslash,
    SingleQuoted,
    DoubleQuoted,
    DoubleQuotedBackslash,
    Comment,
}

pub fn split(s: &str) -> Result<Vec<String>, ParseError> {
    use State::*;

    let mut words = Vec::new();
    let mut word = String::new();
    let mut chars = s.chars();
    let mut state = Delimiter;

    loop {
        let c = chars.next();
        state = match state {
            Delimiter => match c {
                None => break,
                Some('\'') => SingleQuoted,
                Some('\"') => DoubleQuoted,
                Some('\\') => Backslash,
                Some('\t') | Some(' ') | Some('\n') => Delimiter,
                Some('#') => Comment,
                Some(c) => {
                    word.push(c);
                    Unquoted
                }
            },
            Backslash => match c {
                None => {
                    word.push('\\');
                    words.push(std::mem::take(&mut word));
                    break;
                }
                Some('\n') => Delimiter,
                Some(c) => {
                    word.push(c);
                    Unquoted
                }
            },
            Unquoted => match c {
                None => {
                    words.push(std::mem::take(&mut word));
                    break;
                }
                Some('\'') => SingleQuoted,
                Some('\"') => DoubleQuoted,
                Some('\\') => UnquotedBackslash,
                Some('\t') | Some(' ') | Some('\n') => {
                    words.push(std::mem::take(&mut word));
                    Delimiter
                }
                Some(c) => {
                    word.push(c);
                    Unquoted
                }
            },
            UnquotedBackslash => match c {
                None => {
                    word.push('\\');
                    words.push(std::mem::take(&mut word));
                    break;
                }
                Some('\n') => Unquoted,
                Some(c) => {
                    word.push(c);
                    Unquoted
                }
            },
            SingleQuoted => match c {
                None => return Err(ParseError),
                Some('\'') => Unquoted,
                Some(c) => {
                    word.push(c);
                    SingleQuoted
                }
            },
            DoubleQuoted => match c {
                None => return Err(ParseError),
                Some('\"') => Unquoted,
                Some('\\') => DoubleQuotedBackslash,
                Some(c) => {
                    word.push(c);
                    DoubleQuoted
                }
            },
            DoubleQuotedBackslash => match c {
                None => return Err(ParseError),
                Some('\n') => DoubleQuoted,
                Some(c @ '$') | Some(c @ '`') | Some(c @ '"') | Some(c @ '\\') => {
                    word.push(c);
                    DoubleQuoted
                }
                Some(c) => {
                    word.push('\\');
                    word.push(c);
                    DoubleQuoted
                }
            },
            Comment => match c {
                None => break,
                Some('\n') => Delimiter,
                Some(_) => Comment,
            },
        }
    }

    Ok(words)
}
