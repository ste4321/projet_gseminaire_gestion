const Info = () => {
    return(
        <>
        <div class="content-wrapper">

            <div class="container-xxl flex-grow-1 container-p-y">
              <h4 class="fw-bold py-3 mb-4"><span class="text-muted fw-light">Admin / </span>Info</h4>
              <div class="row">
                <div className="col-xxl">
                  <div className="card mb-4">
                    <div className="card-header d-flex align-items-center justify-content-between">
                      <h5 className="mb-0">Basic Layout</h5>
                      <small className="text-muted float-end">Default label</small>
                    </div>
                    <div className="card-body">
                      <form>
                        <div className="row mb-3">
                          <label className="col-sm-2 col-form-label" for="basic-default-name">Name</label>
                          <div className="col-sm-10">
                            <input type="text" className="form-control" id="basic-default-name" placeholder="John Doe" />
                          </div>
                        </div>
                        <div className="row mb-3">
                          <label className="col-sm-2 col-form-label" for="basic-default-company">Company</label>
                          <div className="col-sm-10">
                            <input
                              type="text"
                              className="form-control"
                              id="basic-default-company"
                              placeholder="ACME Inc."
                            />
                          </div>
                        </div>
                        <div className="row mb-3">
                          <label className="col-sm-2 col-form-label" for="basic-default-email">Email</label>
                          <div className="col-sm-10">
                            <div className="input-group input-group-merge">
                              <input
                                type="text"
                                id="basic-default-email"
                                className="form-control"
                                placeholder="john.doe"
                                aria-label="john.doe"
                                aria-describedby="basic-default-email2"
                              />
                              <span className="input-group-text" id="basic-default-email2">@example.com</span>
                            </div>
                            <div className="form-text">You can use letters, numbers & periods</div>
                          </div>
                        </div>
                        <div className="row mb-3">
                          <label className="col-sm-2 col-form-label" for="basic-default-phone">Phone No</label>
                          <div className="col-sm-10">
                            <input
                              type="text"
                              id="basic-default-phone"
                              className="form-control phone-mask"
                              placeholder="658 799 8941"
                              aria-label="658 799 8941"
                              aria-describedby="basic-default-phone"
                            />
                          </div>
                        </div>
                        <div className="row mb-3">
                          <label className="col-sm-2 col-form-label" for="basic-default-message">Message</label>
                          <div className="col-sm-10">
                            <textarea
                              id="basic-default-message"
                              className="form-control"
                              placeholder="Hi, Do you have a moment to talk Joe?"
                              aria-label="Hi, Do you have a moment to talk Joe?"
                              aria-describedby="basic-icon-default-message2"
                            ></textarea>
                          </div>
                        </div>
                        <div className="row justify-content-end">
                          <div className="col-sm-10">
                            <button type="submit" className="btn btn-primary">Send</button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
    )
  };
  export default Info;
  