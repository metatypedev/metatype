// no-auto-license-header

// Copyright (c) 2014 Alex Crichton
// Modifications copyright Metatype OÜ
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

use num_derive::FromPrimitive;
use num_traits::FromPrimitive;
use std::any::Any;
use wasmedge_sdk::*;

#[derive(Debug)]
#[allow(dead_code)]
pub enum Param<'a> {
    I8(i8),
    U8(u8),
    I16(i16),
    U16(u16),
    I32(i32),
    U32(u32),
    I64(i64),
    U64(u64),
    F32(f32),
    F64(f64),
    Bool(bool),
    VecI8(&'a Vec<i8>),
    VecU8(&'a Vec<u8>),
    VecI16(&'a Vec<i16>),
    VecU16(&'a Vec<u16>),
    VecI32(&'a Vec<i32>),
    VecU32(&'a Vec<u32>),
    VecI64(&'a Vec<i64>),
    VecU64(&'a Vec<u64>),
    String(&'a str),
}

impl<'a> Param<'a> {
    fn settle(&self, vm: &Vm, mem: &mut Memory) -> WasmEdgeResult<(i32, i32)> {
        match self {
            Param::I8(v) => {
                let length = 1;
                let pointer = allocate(vm, length)?;
                mem.write(vec![*v as u8], pointer as u32)?;
                Ok((pointer, length))
            }
            Param::U8(v) => {
                let length = 1;
                let pointer = allocate(vm, length)?;
                mem.write(vec![*v], pointer as u32)?;
                Ok((pointer, length))
            }
            Param::I16(v) => {
                let length = 1;
                let pointer = allocate(vm, length * 2)?;
                let bytes = v.to_le_bytes();
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::U16(v) => {
                let length = 2;
                let pointer = allocate(vm, length * 2)?;
                let bytes = v.to_le_bytes();
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::I32(v) => {
                let length = 1;
                let pointer = allocate(vm, length * 4)?;
                let bytes = v.to_le_bytes();
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::U32(v) => {
                let length = 1;
                let pointer = allocate(vm, length * 4)?;
                let bytes = v.to_le_bytes();
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::I64(v) => {
                let length = 1;
                let pointer = allocate(vm, length * 8)?;
                let bytes = v.to_le_bytes();
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::U64(v) => {
                let length = 1;
                let pointer = allocate(vm, length * 8)?;
                let bytes = v.to_le_bytes();
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::F32(v) => {
                let length = 1;
                let pointer = allocate(vm, length * 4)?;
                let bytes = v.to_le_bytes();
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::F64(v) => {
                let length = 1;
                let pointer = allocate(vm, length * 8)?;
                let bytes = v.to_le_bytes();
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::Bool(v) => {
                let length = 1;
                let pointer = allocate(vm, length)?;
                let byte: u8 = match v {
                    true => 1,
                    false => 0,
                };
                mem.write(vec![byte], pointer as u32)?;
                Ok((pointer, length))
            }
            Param::VecI8(v) => {
                let length = v.len() as i32;
                let pointer = allocate(vm, length)?;
                let mut bytes = vec![0; length as usize];
                for (pos, iv) in v.iter().enumerate() {
                    bytes[pos] = *iv as u8;
                }
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::VecU8(v) => {
                let length = v.len() as i32;
                let pointer = allocate(vm, length)?;
                let mut bytes = vec![0; length as usize];
                for (pos, iv) in v.iter().enumerate() {
                    bytes[pos] = *iv;
                }
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::VecI16(v) => {
                let length = v.len() as i32;
                let pointer = allocate(vm, length * 2)?;
                let mut bytes = vec![0; length as usize * 2];
                for (pos, iv) in v.iter().enumerate() {
                    let b = iv.to_le_bytes();
                    for i in 0..2 {
                        bytes[pos * 2 + i] = b[i];
                    }
                }
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::VecU16(v) => {
                let length = v.len() as i32;
                let pointer = allocate(vm, length * 2)?;
                let mut bytes = vec![0; length as usize * 2];
                for (pos, iv) in v.iter().enumerate() {
                    let b = iv.to_le_bytes();
                    for i in 0..2 {
                        bytes[pos * 2 + i] = b[i];
                    }
                }
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::VecI32(v) => {
                let length = v.len() as i32;
                let pointer = allocate(vm, length * 4)?;
                let mut bytes = vec![0; length as usize * 4];
                for (pos, iv) in v.iter().enumerate() {
                    let b = iv.to_le_bytes();
                    for i in 0..4 {
                        bytes[pos * 4 + i] = b[i];
                    }
                }
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::VecU32(v) => {
                let length = v.len() as i32;
                let pointer = allocate(vm, length * 4)?;
                let mut bytes = vec![0; length as usize * 4];
                for (pos, iv) in v.iter().enumerate() {
                    let b = iv.to_le_bytes();
                    for i in 0..4 {
                        bytes[pos * 4 + i] = b[i];
                    }
                }
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::VecI64(v) => {
                let length = v.len() as i32;
                let pointer = allocate(vm, length * 8)?;
                let mut bytes = vec![0; length as usize * 8];
                for (pos, iv) in v.iter().enumerate() {
                    let b = iv.to_le_bytes();
                    for i in 0..8 {
                        bytes[pos * 8 + i] = b[i];
                    }
                }
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::VecU64(v) => {
                let length = v.len() as i32;
                let pointer = allocate(vm, length * 8)?;
                let mut bytes = vec![0; length as usize * 8];
                for (pos, iv) in v.iter().enumerate() {
                    let b = iv.to_le_bytes();
                    for i in 0..8 {
                        bytes[pos * 8 + i] = b[i];
                    }
                }
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
            Param::String(v) => {
                let bytes = v.as_bytes().to_vec();
                let length = bytes.len() as i32;
                let pointer = allocate(vm, length)?;
                mem.write(bytes, pointer as u32)?;
                Ok((pointer, length))
            }
        }
    }
}

fn allocate(vm: &Vm, size: i32) -> WasmEdgeResult<i32> {
    match vm.run_func(None, "allocate", vec![WasmValue::from_i32(size)]) {
        Ok(rv) => Ok(rv[0].to_i32()),
        Err(e) => Err(e),
    }
}

#[derive(FromPrimitive)]
enum RetTypes {
    U8 = 1,
    I8 = 2,
    U16 = 3,
    I16 = 4,
    U32 = 5,
    I32 = 6,
    U64 = 7,
    I64 = 8,
    F32 = 9,
    F64 = 10,
    Bool = 11,
    Char = 12,
    U8Array = 21,
    I8Array = 22,
    U16Array = 23,
    I16Array = 24,
    U32Array = 25,
    I32Array = 26,
    U64Array = 27,
    I64Array = 28,
    String = 31,
}

pub struct Bindgen {
    vm: Box<Vm>, // Can't use Arc because vm can be get_mut after cloned for hostfunc
}

unsafe impl Send for Bindgen {}
unsafe impl Sync for Bindgen {}

impl Bindgen {
    pub fn new(vm: Vm) -> Self {
        Bindgen { vm: Box::new(vm) }
    }

    pub fn run_wasm(
        &mut self,
        func_name: impl AsRef<str>,
        inputs: Vec<Param>,
    ) -> WasmEdgeResult<Result<Vec<Box<dyn Any + Send + Sync>>, String>> {
        let inputs_count = inputs.len() as i32;

        // allocate new frame for passing pointers
        let pointer_of_pointers = match self.vm.run_func(
            None,
            "allocate",
            vec![WasmValue::from_i32(inputs_count * 4 * 2)],
        ) {
            Ok(rv) => rv[0].to_i32(),
            Err(e) => {
                println!("allocate error: {:?}", e);
                return Err(e);
            }
        };

        let mut memory = self.vm.active_module().unwrap().memory("memory").unwrap();

        for (pos, inp) in inputs.iter().enumerate() {
            let sr = inp.settle(&self.vm, &mut memory);
            let (pointer, length_of_input) = match sr {
                Ok(r) => (r.0, r.1),
                Err(e) => {
                    println!("run_wasm error: {}", func_name.as_ref());
                    return Err(e);
                }
            };

            memory.write(
                pointer.to_le_bytes(),
                pointer_of_pointers as u32 + pos as u32 * 4 * 2,
            )?;
            memory.write(
                length_of_input.to_le_bytes(),
                pointer_of_pointers as u32 + pos as u32 * 4 * 2 + 4,
            )?;
        }

        let rets = self.vm.run_func(
            None,
            func_name,
            vec![
                WasmValue::from_i32(pointer_of_pointers),
                WasmValue::from_i32(inputs_count),
            ],
        )?;
        // Don't need to deallocate because the memory will be loaded and free in the wasm
        // self.vm.run_function("deallocate", vec![WasmValue::from_i32(pointer_of_pointers), WasmValue::from_i32(inputs_count * 4 * 2)])?;

        if rets.len() != 1 {
            return Ok(Err(String::from("Invalid return value")));
        }
        let rvec = memory.read(rets[0].to_i32() as u32, 9)?;
        let _ = self.vm.run_func(
            None,
            "deallocate",
            vec![
                WasmValue::from_i32(rets[0].to_i32()),
                WasmValue::from_i32(9),
            ],
        );

        let flag = rvec[0];
        let ret_pointer = i32::from_le_bytes(rvec[1..5].try_into().unwrap());
        let ret_len = i32::from_le_bytes(rvec[5..9].try_into().unwrap());
        match flag {
            0 => Ok(Ok(self.parse_result(ret_pointer, ret_len))),
            _ => Ok(Err(self.parse_error(ret_pointer, ret_len))),
        }
    }

    fn parse_error(&self, ret_pointer: i32, ret_len: i32) -> String {
        let memory = self.vm.active_module().unwrap().memory("memory").unwrap();
        let err_bytes = memory.read(ret_pointer as u32, ret_len as u32).unwrap();
        let _ = self.vm.run_func(
            None,
            "deallocate",
            vec![
                WasmValue::from_i32(ret_pointer),
                WasmValue::from_i32(ret_len),
            ],
        );
        String::from_utf8(err_bytes).unwrap_or_default()
    }

    fn parse_result(&self, ret_pointer: i32, ret_len: i32) -> Vec<Box<dyn Any + Send + Sync>> {
        let size = ret_len as usize;
        let memory = self.vm.active_module().unwrap().memory("memory").unwrap();
        let p_data = memory
            .read(ret_pointer as u32, size as u32 * 3 * 4)
            .unwrap();
        let _ = self.vm.run_func(
            None,
            "deallocate",
            vec![
                WasmValue::from_i32(ret_pointer),
                WasmValue::from_i32(size as i32 * 3 * 4),
            ],
        );

        let mut p_values = vec![0; size * 3];

        for i in 0..size * 3 {
            p_values[i] = i32::from_le_bytes(p_data[i * 4..(i + 1) * 4].try_into().unwrap());
        }

        let mut results: Vec<Box<dyn Any + Send + Sync>> = Vec::with_capacity(size);

        for i in 0..size {
            let bytes = memory
                .read(p_values[i * 3] as u32, p_values[i * 3 + 2] as u32)
                .unwrap();
            let _ = self.vm.run_func(
                None,
                "deallocate",
                vec![
                    WasmValue::from_i32(p_values[i * 3]),
                    WasmValue::from_i32(p_values[i * 3 + 2]),
                ],
            );
            match FromPrimitive::from_i32(p_values[i * 3 + 1]) {
                Some(RetTypes::U8) => {
                    results.push(Box::new(bytes[0]));
                }
                Some(RetTypes::I8) => {
                    results.push(Box::new(bytes[0] as i8));
                }
                Some(RetTypes::U16) => {
                    let v = u16::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(v));
                }
                Some(RetTypes::I16) => {
                    let v = i16::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(v));
                }
                Some(RetTypes::U32) => {
                    let v = u32::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(v));
                }
                Some(RetTypes::I32) => {
                    let v = i32::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(v));
                }
                Some(RetTypes::U64) => {
                    let v = u64::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(v));
                }
                Some(RetTypes::I64) => {
                    let v = i64::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(v));
                }
                Some(RetTypes::F32) => {
                    let v = f32::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(v));
                }
                Some(RetTypes::F64) => {
                    let v = f64::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(v));
                }
                Some(RetTypes::Bool) => {
                    results.push(Box::new(bytes[0] == 1 /* as u8*/));
                }
                Some(RetTypes::Char) => {
                    let v = u32::from_le_bytes(bytes.try_into().unwrap());
                    results.push(Box::new(char::from_u32(v)));
                }
                Some(RetTypes::U8Array) => {
                    let len = bytes.len();
                    let mut v = vec![0; len];
                    // for i in 0..len {
                    //     v[i] = bytes[i]/* as u8*/;
                    // }
                    v[..len].copy_from_slice(&bytes[..len]);
                    results.push(Box::new(v));
                }
                Some(RetTypes::I8Array) => {
                    let len = bytes.len();
                    let mut v = vec![0; len];
                    for i in 0..len {
                        v[i] = bytes[i] as i8;
                    }
                    results.push(Box::new(v));
                }
                Some(RetTypes::U16Array) => {
                    let len = bytes.len() / 2;
                    let mut v = vec![0; len];
                    for i in 0..len {
                        v[i] = u16::from_le_bytes(bytes[i * 2..(i + 1) * 2].try_into().unwrap());
                    }
                    results.push(Box::new(v));
                }
                Some(RetTypes::I16Array) => {
                    let len = bytes.len() / 2;
                    let mut v = vec![0; len];
                    for i in 0..len {
                        v[i] = i16::from_le_bytes(bytes[i * 2..(i + 1) * 2].try_into().unwrap());
                    }
                    results.push(Box::new(v));
                }
                Some(RetTypes::U32Array) => {
                    let len = bytes.len() / 4;
                    let mut v = vec![0; len];
                    for i in 0..len {
                        v[i] = u32::from_le_bytes(bytes[i * 4..(i + 1) * 4].try_into().unwrap());
                    }
                    results.push(Box::new(v));
                }
                Some(RetTypes::I32Array) => {
                    let len = bytes.len() / 4;
                    let mut v = vec![0; len];
                    for i in 0..len {
                        v[i] = i32::from_le_bytes(bytes[i * 4..(i + 1) * 4].try_into().unwrap());
                    }
                    results.push(Box::new(v));
                }
                Some(RetTypes::U64Array) => {
                    let len = bytes.len() / 8;
                    let mut v = vec![0; len];
                    for i in 0..len {
                        v[i] = u64::from_le_bytes(bytes[i * 8..(i + 1) * 8].try_into().unwrap());
                    }
                    results.push(Box::new(v));
                }
                Some(RetTypes::I64Array) => {
                    let len = bytes.len() / 8;
                    let mut v = vec![0; len];
                    for i in 0..len {
                        v[i] = i64::from_le_bytes(bytes[i * 8..(i + 1) * 8].try_into().unwrap());
                    }
                    results.push(Box::new(v));
                }
                Some(RetTypes::String) => {
                    results.push(Box::new(String::from_utf8(bytes).unwrap()));
                }
                None => {}
            }
        }

        results
    }
}
