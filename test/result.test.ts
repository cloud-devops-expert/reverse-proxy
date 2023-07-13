import { ACM } from "aws-sdk";

describe("", () => {
  it("spec name", () => {
    // const record = {
    //   ResourceRecord: {
    //     Name: "www.example.com",
    //     Type: "CNAME",
    //     Value: "www.example.com",
    //   },
    // };

    const record: ACM.DomainValidation = {
      DomainName: "test",
      ResourceRecord: {
        Name: "www.example.com",
        Type: "CNAME",
        Value: "www.example.com",
      },
    };

    const result = [
      record?.ResourceRecord,
      { Name: "", Type: "CNAME", Value: "test" },
    ].filter(Boolean);

    expect(result).toEqual([
      {
        Name: "",
        Type: "CNAME",
        Value: "test",
      },
    ]);
  });
});
